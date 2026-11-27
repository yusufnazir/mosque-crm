package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.config.WahaProperties;
import com.mosque.crm.dto.WhatsAppChannelStatsDTO;
import com.mosque.crm.dto.WhatsAppEnqueueRequest;
import com.mosque.crm.dto.WhatsAppEnqueueResultDTO;
import com.mosque.crm.dto.WhatsAppMessageDTO;
import com.mosque.crm.dto.WhatsAppOptOutDTO;
import com.mosque.crm.dto.WhatsAppReplyDTO;
import com.mosque.crm.dto.WhatsAppSkippedRecipientDTO;
import com.mosque.crm.dto.WhatsAppStatsDTO;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.WhatsAppChannel;
import com.mosque.crm.entity.WhatsAppInboundMessage;
import com.mosque.crm.entity.WhatsAppOptOut;
import com.mosque.crm.entity.WhatsAppOutboundMessage;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.repository.WhatsAppInboundRepository;
import com.mosque.crm.repository.WhatsAppOptOutRepository;
import com.mosque.crm.repository.WhatsAppOutboundRepository;
import com.mosque.crm.util.PhoneUtils;

/**
 * The outbound queue: enqueue (with pacing + opt-out filtering), listing, cancellation and
 * the claim/mark operations used by {@link WhatsAppDispatcher}.
 *
 * Nothing here talks to WAHA — sending lives in the worker so a request never blocks on
 * WhatsApp and the anti-ban pacing cannot be bypassed.
 */
@Service
public class WhatsAppOutboundService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppOutboundService.class);

    /** Per-recipient skip lines written to the log before falling back to a summary line. */
    private static final int MAX_SKIP_LOG_LINES = 100;

    private final WhatsAppOutboundRepository outboundRepository;
    private final WhatsAppOptOutRepository optOutRepository;
    private final WhatsAppInboundRepository inboundRepository;
    private final PersonRepository personRepository;
    private final OrganizationRepository organizationRepository;
    private final SpintaxResolver spintaxResolver;
    private final WhatsAppRateLimiter rateLimiter;
    private final WahaSettingsService wahaSettings;
    private final WhatsAppChannelService channelService;
    private final AuthorizationService authorizationService;

    public WhatsAppOutboundService(WhatsAppOutboundRepository outboundRepository,
                                   WhatsAppOptOutRepository optOutRepository,
                                   WhatsAppInboundRepository inboundRepository,
                                   PersonRepository personRepository,
                                   OrganizationRepository organizationRepository,
                                   SpintaxResolver spintaxResolver,
                                   WhatsAppRateLimiter rateLimiter,
                                   WahaSettingsService wahaSettings,
                                   WhatsAppChannelService channelService,
                                   AuthorizationService authorizationService) {
        this.outboundRepository = outboundRepository;
        this.optOutRepository = optOutRepository;
        this.inboundRepository = inboundRepository;
        this.personRepository = personRepository;
        this.organizationRepository = organizationRepository;
        this.spintaxResolver = spintaxResolver;
        this.rateLimiter = rateLimiter;
        this.wahaSettings = wahaSettings;
        this.channelService = channelService;
        this.authorizationService = authorizationService;
    }

    /** Live settings (Settings → WhatsApp overrides the environment defaults). */
    private WahaProperties settings() {
        return wahaSettings.effective();
    }

    // ==================== Enqueue ====================

    @Transactional
    public WhatsAppEnqueueResultDTO enqueue(WhatsAppEnqueueRequest request, Long createdBy) {
        boolean hasMedia = request.getMediaBase64() != null && !request.getMediaBase64().isBlank();
        if ((request.getTemplate() == null || request.getTemplate().isBlank()) && !hasMedia) {
            throw new IllegalArgumentException("A message template is required.");
        }

        String profile = WhatsAppOutboundMessage.Profile.CONVERSATION.equalsIgnoreCase(request.getProfile())
                ? WhatsAppOutboundMessage.Profile.CONVERSATION
                : WhatsAppOutboundMessage.Profile.COLD;

        String countryCode = request.getDefaultCountryCode() != null && !request.getDefaultCountryCode().isBlank()
                ? request.getDefaultCountryCode().replaceAll("[^0-9]", "")
                : settings().getDefaultCountryCode();

        // The number is chosen once, here. Nothing downstream re-resolves it, so a retry can
        // never switch senders.
        WhatsAppChannel channel = channelService.requireChannel(request.getChannelId(), null);

        String organizationName = currentOrganizationName();
        String campaignId = UUID.randomUUID().toString();
        WhatsAppEnqueueResultDTO result = new WhatsAppEnqueueResultDTO(campaignId);

        // Start pacing from whatever is already queued, so a second campaign does not bunch up
        LocalDateTime cursor = outboundRepository.findLastQueuedNextAttempt()
                .filter(last -> last.isAfter(LocalDateTime.now()))
                .orElse(LocalDateTime.now());
        LocalDateTime scheduledAt = request.getScheduledAt();
        if (scheduledAt != null && scheduledAt.isAfter(cursor)) {
            cursor = scheduledAt;
        }

        Set<String> seen = new HashSet<>();
        for (Recipient recipient : resolveRecipients(request, countryCode)) {
            String phone = recipient.phone();
            if (phone == null) {
                String reason = recipient.skipReason() == null
                        ? WhatsAppSkippedRecipientDTO.Reason.INVALID_FORMAT
                        : recipient.skipReason();
                if (WhatsAppSkippedRecipientDTO.Reason.NO_PHONE.equals(reason)) {
                    result.incrementSkippedNoPhone();
                } else {
                    result.incrementSkippedInvalid();
                }
                result.addSkipped(recipient.name(), recipient.rawPhone(), reason, describe(reason));
                continue;
            }
            if (!seen.add(phone)) {
                result.incrementSkippedDuplicate();
                result.addSkipped(recipient.name(), recipient.rawPhone(),
                        WhatsAppSkippedRecipientDTO.Reason.DUPLICATE, describe(WhatsAppSkippedRecipientDTO.Reason.DUPLICATE));
                continue;
            }
            if (optOutRepository.existsByChannelIdAndPhoneE164(channel.getId(), phone)
                    || optOutRepository.existsByPhoneE164AndChannelIdIsNull(phone)) {
                result.incrementSkippedOptOut();
                result.addSkipped(recipient.name(), recipient.rawPhone(),
                        WhatsAppSkippedRecipientDTO.Reason.OPT_OUT, describe(WhatsAppSkippedRecipientDTO.Reason.OPT_OUT));
                continue;
            }
            if (outboundRepository.countPendingForPhoneAndChannel(phone, channel.getId()) > 0) {
                result.incrementSkippedDuplicate();
                result.addSkipped(recipient.name(), recipient.rawPhone(),
                        WhatsAppSkippedRecipientDTO.Reason.ALREADY_QUEUED,
                        describe(WhatsAppSkippedRecipientDTO.Reason.ALREADY_QUEUED));
                continue;
            }

            String body = request.getTemplate() == null || request.getTemplate().isBlank()
                    ? ""
                    : spintaxResolver.resolve(request.getTemplate(), Map.of(
                            "name", recipient.name() == null ? "" : recipient.name(),
                            "first_name", firstName(recipient.name()),
                            "org", organizationName));

            WhatsAppOutboundMessage message = new WhatsAppOutboundMessage();
            message.setCampaignId(campaignId);
            message.setChannelId(channel.getId());
            message.setWahaSession(channel.getWahaSession());
            message.setRecipientPhone(phone);
            message.setRecipientName(recipient.name());
            message.setRenderedBody(body);
            if (hasMedia) {
                message.setMediaFilename(request.getMediaFilename());
                message.setMediaMimetype(request.getMediaMimetype());
                message.setMediaData(request.getMediaBase64());
            }
            message.setProfile(profile);
            message.setStatus(WhatsAppOutboundMessage.Status.QUEUED);
            message.setAttemptCount(0);
            message.setCreatedBy(createdBy);

            cursor = cursor.plusSeconds(randomDelaySeconds(profile));
            message.setNextAttemptAt(cursor);

            outboundRepository.save(message);
            result.incrementQueued();
        }

        log.info("Queued WhatsApp campaign {} on channel '{}' ({}): {} queued, {} opt-out, {} invalid, {} no phone, {} duplicate",
                campaignId, channel.getLabel(), channel.getWahaSession(), result.getQueued(), result.getSkippedOptOut(),
                result.getSkippedInvalid(), result.getSkippedNoPhone(), result.getSkippedDuplicate());
        // Name the people who were dropped so the admin can fix their data instead of guessing
        logSkipped(campaignId, result);
        return result;
    }

    private record Recipient(String phone, String rawPhone, String name, String skipReason) {
    }

    private List<Recipient> resolveRecipients(WhatsAppEnqueueRequest request,
                                              String countryCode) {
        String type = request.getRecipientType() == null ? "CUSTOM" : request.getRecipientType().toUpperCase();

        if ("ALL_MEMBERS".equals(type) || "ACTIVE_MEMBERS".equals(type)) {
            List<Person> persons = "ACTIVE_MEMBERS".equals(type)
                    ? personRepository.findAllActivePersons()
                    : personRepository.findAll();
            List<Recipient> recipients = new ArrayList<>();
            for (Person person : persons) {
                String raw = person.getPhone();
                String phone = PhoneUtils.toE164(raw, countryCode);
                String skipReason = null;
                if (phone == null) {
                    skipReason = raw == null || raw.isBlank()
                            ? WhatsAppSkippedRecipientDTO.Reason.NO_PHONE
                            : WhatsAppSkippedRecipientDTO.Reason.INVALID_FORMAT;
                }
                recipients.add(new Recipient(phone, raw, fullName(person), skipReason));
            }
            return recipients;
        }

        List<Recipient> recipients = new ArrayList<>();
        List<String> phones = request.getPhones() == null ? List.of() : request.getPhones();
        for (String raw : phones) {
            String phone = PhoneUtils.toE164(raw, countryCode);
            recipients.add(new Recipient(phone, raw, null,
                    phone == null ? WhatsAppSkippedRecipientDTO.Reason.INVALID_FORMAT : null));
        }
        return recipients;
    }

    /** Human readable skip reason, shared with the UI through the enqueue result. */
    private String describe(String reason) {
        if (WhatsAppSkippedRecipientDTO.Reason.NO_PHONE.equals(reason)) {
            return "No phone number on file";
        }
        if (WhatsAppSkippedRecipientDTO.Reason.INVALID_FORMAT.equals(reason)) {
            return "The phone number is not a valid international number";
        }
        if (WhatsAppSkippedRecipientDTO.Reason.OPT_OUT.equals(reason)) {
            return "Recipient opted out of WhatsApp";
        }
        if (WhatsAppSkippedRecipientDTO.Reason.ALREADY_QUEUED.equals(reason)) {
            return "A message for this number is already waiting in the queue";
        }
        return "The same number appears more than once in this batch";
    }

    /** Logs at most {@link #MAX_SKIP_LOG_LINES} named skips, then a summary line. */
    private void logSkipped(String campaignId, WhatsAppEnqueueResultDTO result) {
        if (result.getSkippedTotal() == 0) {
            return;
        }
        int written = 0;
        for (WhatsAppSkippedRecipientDTO skipped : result.getSkipped()) {
            if (written >= MAX_SKIP_LOG_LINES) {
                break;
            }
            written++;
            log.warn("WhatsApp campaign {} skipped {} ({}) — [{}] {}",
                    campaignId,
                    skipped.getName() == null ? "unnamed recipient" : skipped.getName(),
                    skipped.getPhone() == null || skipped.getPhone().isBlank() ? "no number" : skipped.getPhone(),
                    skipped.getReason(),
                    skipped.getDetail());
        }
        if (result.getSkippedTotal() > written) {
            log.warn("WhatsApp campaign {}: {} recipient(s) skipped in total, {} more not listed in the log",
                    campaignId, result.getSkippedTotal(), result.getSkippedTotal() - written);
        }
    }

    // ==================== Queue operations (worker) ====================

    /**
     * Claims the next due message and marks it SENDING. Runs in its own transaction with a
     * pessimistic lock so two app instances can never claim the same row.
     */
    @Transactional
    public Optional<WhatsAppOutboundMessage> claimNext() {
        List<WhatsAppOutboundMessage> due = outboundRepository.findDueForUpdate(
                LocalDateTime.now(), PageRequest.of(0, 1));
        if (due.isEmpty()) {
            return Optional.empty();
        }
        WhatsAppOutboundMessage message = due.get(0);
        message.setStatus(WhatsAppOutboundMessage.Status.SENDING);
        outboundRepository.save(message);
        return Optional.of(message);
    }

    @Transactional
    public void markSent(Long id, String waMessageId) {
        outboundRepository.findById(id).ifPresent(message -> {
            message.setStatus(WhatsAppOutboundMessage.Status.SENT);
            message.setSentAt(LocalDateTime.now());
            message.setWaMessageId(waMessageId);
            message.setAttemptCount(message.getAttemptCount() + 1);
            message.setLastError(null);
            outboundRepository.save(message);
        });
    }

    @Transactional
    public void markAttemptFailed(Long id, String error, boolean retryable) {
        outboundRepository.findById(id).ifPresent(message -> {
            int attempts = message.getAttemptCount() + 1;
            message.setAttemptCount(attempts);
            message.setLastError(error == null ? null : error.substring(0, Math.min(error.length(), 1900)));

            boolean giveUp = !retryable || attempts >= settings().getMaxAttempts();
            if (giveUp) {
                message.setStatus(WhatsAppOutboundMessage.Status.FAILED);
            } else {
                message.setStatus(WhatsAppOutboundMessage.Status.QUEUED);
                // Exponential backoff: 1 min, 4 min, 9 min…
                message.setNextAttemptAt(LocalDateTime.now().plusMinutes((long) attempts * attempts));
            }
            outboundRepository.save(message);
        });
    }

    @Transactional
    public void markSkipped(Long id, String reason) {
        outboundRepository.findById(id).ifPresent(message -> {
            message.setStatus(WhatsAppOutboundMessage.Status.SKIPPED);
            message.setLastError(reason);
            outboundRepository.save(message);
        });
    }

    /**
     * Puts a claimed message back in the queue without counting a delivery attempt — used when
     * the number itself is not available (session logged out, WAHA unreachable).
     */
    @Transactional
    public void release(Long id, LocalDateTime retryAt, String reason) {
        outboundRepository.findById(id).ifPresent(message -> {
            message.setStatus(WhatsAppOutboundMessage.Status.QUEUED);
            message.setNextAttemptAt(retryAt);
            message.setLastError(reason);
            outboundRepository.save(message);
        });
    }

    /** Pushes every due message to {@code retryAt} (caps reached / quiet hours). */
    @Transactional
    public int deferDue(LocalDateTime retryAt) {
        return outboundRepository.deferDue(LocalDateTime.now(), retryAt);
    }

    /**
     * After a successful send, push the next queued message out to at least
     * {@code sentAt + randomized delay}, so the spacing reflects the real send moment.
     */
    @Transactional
    public void paceNextQueued(LocalDateTime sentAt) {
        List<WhatsAppOutboundMessage> next = outboundRepository.findNextQueued(PageRequest.of(0, 1));
        if (next.isEmpty()) {
            return;
        }
        WhatsAppOutboundMessage message = next.get(0);
        String profile = effectiveProfile(message.getChannelId(), message.getRecipientPhone(), message.getProfile());
        LocalDateTime earliest = sentAt.plusSeconds(randomDelaySeconds(profile));
        if (message.getNextAttemptAt() == null || message.getNextAttemptAt().isBefore(earliest)) {
            message.setNextAttemptAt(earliest);
            outboundRepository.save(message);
        }
    }

    /** A contact who replied on this number recently gets the shorter "conversation" spacing. */
    public String effectiveProfile(Long channelId, String phone, String fallbackProfile) {
        LocalDateTime windowStart = LocalDateTime.now().minusHours(settings().getConversationWindowHours());
        boolean replied = channelId == null
                ? inboundRepository.existsByFromPhoneAndReceivedAtAfter(phone, windowStart)
                : inboundRepository.existsByChannelIdAndFromPhoneAndReceivedAtAfter(channelId, phone, windowStart);
        if (replied) {
            return WhatsAppOutboundMessage.Profile.CONVERSATION;
        }
        return fallbackProfile == null ? WhatsAppOutboundMessage.Profile.COLD : fallbackProfile;
    }

    @Transactional
    public int cancelPendingForPhone(Long channelId, String phone, String reason) {
        List<WhatsAppOutboundMessage> pending = outboundRepository.findByRecipientPhoneAndStatus(
                phone, WhatsAppOutboundMessage.Status.QUEUED);
        int cancelled = 0;
        for (WhatsAppOutboundMessage message : pending) {
            if (channelId != null && message.getChannelId() != null
                    && !channelId.equals(message.getChannelId())) {
                continue;
            }
            message.setStatus(WhatsAppOutboundMessage.Status.CANCELLED);
            message.setLastError(reason);
            outboundRepository.save(message);
            cancelled++;
        }
        return cancelled;
    }

    // ==================== Queries (admin UI) ====================

    @Transactional(readOnly = true)
    public Page<WhatsAppMessageDTO> list(String status, String campaignId, Pageable pageable) {
        Page<WhatsAppOutboundMessage> page;
        if (campaignId != null && !campaignId.isBlank()) {
            page = outboundRepository.findByCampaignIdAndDeletedAtIsNullOrderByCreatedAtAsc(campaignId, pageable);
        } else if (status != null && !status.isBlank()) {
            page = outboundRepository.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(status.toUpperCase(), pageable);
        } else {
            page = outboundRepository.findByDeletedAtIsNullOrderByCreatedAtDesc(pageable);
        }
        Map<Long, String> labels = channelService.labelMap();
        return page.map(message -> toDTO(message, labels));
    }

    @Transactional
    public void deleteMessage(Long id) {
        WhatsAppOutboundMessage message = findManageableForUpdate(id);
        if (WhatsAppOutboundMessage.Status.SENDING.equals(message.getStatus())) {
            throw new IllegalStateException("The message is currently being sent. Try again when it finishes.");
        }
        if (WhatsAppOutboundMessage.Status.QUEUED.equals(message.getStatus())) {
            message.setStatus(WhatsAppOutboundMessage.Status.CANCELLED);
        }
        message.setDeletedAt(LocalDateTime.now());
        message.setRecipientPhone("");
        message.setRecipientName(null);
        message.setRenderedBody("");
        message.setLastError(null);
        message.setWaMessageId(null);
        outboundRepository.save(message);
    }

    private WhatsAppOutboundMessage findManageableForUpdate(Long id) {
        if (!authorizationService.hasPermission("whatsapp.manage")) {
            throw new AccessDeniedException("Insufficient permissions to manage WhatsApp messages");
        }
        WhatsAppOutboundMessage message = outboundRepository
                .findVisibleForUpdate(id, TenantContext.getCurrentOrganizationId())
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));
        if (!authorizationService.hasPermissionForOrganization("whatsapp.manage", message.getOrganizationId())) {
            throw new AccessDeniedException("Insufficient permissions to manage this message");
        }
        return message;
    }

    @Transactional
    public WhatsAppMessageDTO cancel(Long id) {
        WhatsAppOutboundMessage message = findManageableForUpdate(id);
        if (!WhatsAppOutboundMessage.Status.QUEUED.equals(message.getStatus())) {
            throw new IllegalStateException("Only queued messages can be cancelled.");
        }
        message.setStatus(WhatsAppOutboundMessage.Status.CANCELLED);
        message.setLastError("Cancelled by an administrator");
        return toDTO(outboundRepository.save(message), channelService.labelMap());
    }

    /** Queue counters per number. Not transactional: it also asks WAHA for the live states. */
    public WhatsAppStatsDTO stats() {
        LocalDateTime now = LocalDateTime.now();
        WhatsAppStatsDTO dto = new WhatsAppStatsDTO();
        dto.setQueued(outboundRepository.countByStatus(WhatsAppOutboundMessage.Status.QUEUED));
        dto.setSending(outboundRepository.countByStatus(WhatsAppOutboundMessage.Status.SENDING));
        dto.setSent(outboundRepository.countByStatus(WhatsAppOutboundMessage.Status.SENT));
        dto.setFailed(outboundRepository.countByStatus(WhatsAppOutboundMessage.Status.FAILED));
        dto.setCancelled(outboundRepository.countByStatus(WhatsAppOutboundMessage.Status.CANCELLED));
        dto.setOptOuts(optOutRepository.count());

        // One entry per number: each has its own queue, its own counter and its own state.
        List<WhatsAppChannelStatsDTO> channelStats = channelService.list().stream()
                .map(channel -> {
                    WhatsAppChannelStatsDTO item = new WhatsAppChannelStatsDTO();
                    item.setId(channel.getId());
                    item.setLabel(channel.getLabel());
                    item.setWahaSession(channel.getWahaSession());
                    item.setDisplayNumber(channel.getMeId() != null ? channel.getMeId() : channel.getDisplayNumber());
                    item.setEnabled(channel.isEnabled());
                    item.setDefault(channel.isDefault());
                    item.setStatus(channel.getStatus());
                    item.setQueued(outboundRepository.countByStatusAndChannelId(
                            WhatsAppOutboundMessage.Status.QUEUED, channel.getId()));
                    item.setSentToday(outboundRepository.countByStatusAndChannelIdAndSentAtAfter(
                            WhatsAppOutboundMessage.Status.SENT, channel.getId(), rateLimiter.startOfDay(now)));
                    item.setSentTotal(outboundRepository.countByStatusAndChannelId(
                            WhatsAppOutboundMessage.Status.SENT, channel.getId()));
                    return item;
                })
                .collect(Collectors.toList());
        dto.setChannels(channelStats);

        // Legacy single-session fields describe the default number (kept for older clients).
        WhatsAppChannelStatsDTO primary = channelStats.stream()
                .filter(WhatsAppChannelStatsDTO::isDefault)
                .findFirst()
                .orElse(channelStats.isEmpty() ? null : channelStats.get(0));
        if (primary != null) {
            dto.setSessionStatus(primary.getStatus());
            dto.setSessionName(primary.getWahaSession());
        }

        WahaProperties settings = settings();
        dto.setSentLastHour(rateLimiter.sentLastHour(now));
        dto.setSentToday(rateLimiter.sentToday(now));
        dto.setHourlyCap(settings.getMaxPerHour());
        dto.setDailyCap(settings.getMaxPerDay());
        dto.setEffectiveDailyCap(rateLimiter.effectiveDailyCap(now));
        dto.setWarmupDay(outboundRepository.findFirstSentAt()
                .map(first -> rateLimiter.warmupDayNumber(first, now))
                .orElse(1L));

        dto.setQuietHours(rateLimiter.isQuietHours(now));
        dto.setQuietHoursEnd(rateLimiter.isQuietHours(now) ? rateLimiter.nextQuietHoursEnd(now) : null);
        dto.setQuietHoursStart(settings.getQuietHoursStart());
        dto.setQuietHoursEndHour(settings.getQuietHoursEnd());
        dto.setTimezone(settings.getTimezone());

        dto.setColdDelayMinSeconds(settings.getColdDelayMinSeconds());
        dto.setColdDelayMaxSeconds(settings.getColdDelayMaxSeconds());
        dto.setConversationDelayMinSeconds(settings.getConversationDelayMinSeconds());
        dto.setConversationDelayMaxSeconds(settings.getConversationDelayMaxSeconds());
        dto.setTypingSimulationEnabled(settings.getTypingMinSeconds() > 0);

        dto.setRecentReplies(inboundRepository.findAllByOrderByReceivedAtDesc(PageRequest.of(0, 20))
                .stream().map(this::toReplyDTO).collect(Collectors.toList()));
        return dto;
    }

    // ==================== Opt-outs ====================

    @Transactional(readOnly = true)
    public List<WhatsAppOptOutDTO> listOptOuts() {
        Map<Long, String> labels = channelService.labelMap();
        return optOutRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(optOut -> toOptOutDTO(optOut, labels))
                .collect(Collectors.toList());
    }

    @Transactional
    public WhatsAppOptOutDTO addOptOut(String rawPhone, Long channelId, String reason) {
        String phone = PhoneUtils.toE164(rawPhone, settings().getDefaultCountryCode());
        if (phone == null) {
            throw new IllegalArgumentException("A valid phone number is required.");
        }
        WhatsAppChannel channel = channelService.requireChannel(channelId, null);
        Optional<WhatsAppOptOut> existing = optOutRepository.findByChannelIdAndPhoneE164(channel.getId(), phone);
        if (existing.isPresent()) {
            return toOptOutDTO(existing.get(), channelService.labelMap());
        }
        WhatsAppOptOut optOut = new WhatsAppOptOut(phone, TenantContext.getCurrentOrganizationId(),
                null, reason, WhatsAppOptOut.Source.MANUAL);
        optOut.setChannelId(channel.getId());
        cancelPendingForPhone(channel.getId(), phone, "Recipient opted out");
        WhatsAppOptOut saved = optOutRepository.save(optOut);
        return toOptOutDTO(saved, channelService.labelMap());
    }

    @Transactional
    public void removeOptOut(Long id) {
        optOutRepository.findById(id).ifPresent(optOutRepository::delete);
    }

    // ==================== Helpers ====================

    private int randomDelaySeconds(String profile) {
        ThreadLocalRandom random = ThreadLocalRandom.current();
        WahaProperties settings = settings();
        if (WhatsAppOutboundMessage.Profile.CONVERSATION.equals(profile)) {
            int min = Math.max(1, settings.getConversationDelayMinSeconds());
            int max = Math.max(min, settings.getConversationDelayMaxSeconds());
            return random.nextInt(min, max + 1);
        }
        int min = Math.max(1, settings.getColdDelayMinSeconds());
        int max = Math.max(min, settings.getColdDelayMaxSeconds());
        return random.nextInt(min, max + 1);
    }

    private String currentOrganizationName() {
        Long organizationId = TenantContext.getCurrentOrganizationId();
        if (organizationId == null) {
            return "";
        }
        return organizationRepository.findById(organizationId)
                .map(Organization::getName)
                .orElse("");
    }

    private String fullName(Person person) {
        String first = person.getFirstName() == null ? "" : person.getFirstName().trim();
        String last = person.getLastName() == null ? "" : person.getLastName().trim();
        String name = (first + " " + last).trim();
        return name.isEmpty() ? null : name;
    }

    private String firstName(String name) {
        if (name == null || name.isBlank()) {
            return "";
        }
        String trimmed = name.trim();
        int space = trimmed.indexOf(' ');
        return space > 0 ? trimmed.substring(0, space) : trimmed;
    }

    private WhatsAppMessageDTO toDTO(WhatsAppOutboundMessage message, Map<Long, String> labels) {
        WhatsAppMessageDTO dto = new WhatsAppMessageDTO();
        dto.setId(message.getId());
        dto.setCampaignId(message.getCampaignId());
        dto.setChannelId(message.getChannelId());
        dto.setChannelLabel(message.getChannelId() == null ? null : labels.get(message.getChannelId()));
        dto.setChannelSession(message.getWahaSession());
        dto.setRecipientPhone(message.getRecipientPhone());
        dto.setRecipientName(message.getRecipientName());
        dto.setBody(message.getRenderedBody());
        dto.setMediaFilename(message.getMediaFilename());
        dto.setMediaMimetype(message.getMediaMimetype());
        dto.setProfile(message.getProfile());
        dto.setStatus(message.getStatus());
        dto.setAttemptCount(message.getAttemptCount());
        dto.setNextAttemptAt(message.getNextAttemptAt());
        dto.setLastError(message.getLastError());
        dto.setWaMessageId(message.getWaMessageId());
        dto.setCreatedAt(message.getCreatedAt());
        dto.setSentAt(message.getSentAt());
        return dto;
    }

    private WhatsAppOptOutDTO toOptOutDTO(WhatsAppOptOut optOut, Map<Long, String> labels) {
        WhatsAppOptOutDTO dto = new WhatsAppOptOutDTO();
        dto.setId(optOut.getId());
        dto.setChannelId(optOut.getChannelId());
        dto.setChannelLabel(optOut.getChannelId() == null ? null : labels.get(optOut.getChannelId()));
        dto.setPhoneE164(optOut.getPhoneE164());
        dto.setKeyword(optOut.getKeyword());
        dto.setReason(optOut.getReason());
        dto.setSource(optOut.getSource());
        dto.setCreatedAt(optOut.getCreatedAt());
        return dto;
    }

    private WhatsAppReplyDTO toReplyDTO(WhatsAppInboundMessage message) {
        WhatsAppReplyDTO dto = new WhatsAppReplyDTO();
        dto.setId(message.getId());
        dto.setFromPhone(message.getFromPhone());
        dto.setContactName(message.getContactName());
        dto.setBody(message.getBody());
        dto.setOptOut(message.isOptOut());
        dto.setReceivedAt(message.getReceivedAt());
        return dto;
    }
}
