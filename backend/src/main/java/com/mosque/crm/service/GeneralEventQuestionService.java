package com.mosque.crm.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.GeneralEventQuestionAnswerDTO;
import com.mosque.crm.dto.GeneralEventQuestionDTO;
import com.mosque.crm.dto.GeneralEventQuestionOptionDTO;
import com.mosque.crm.dto.GeneralEventQuestionSummaryDTO;
import com.mosque.crm.dto.GeneralEventQuestionTotalDTO;
import com.mosque.crm.dto.GeneralEventRegistrationAnswerDTO;
import com.mosque.crm.entity.GeneralEvent;
import com.mosque.crm.entity.GeneralEventQuestion;
import com.mosque.crm.entity.GeneralEventQuestionOption;
import com.mosque.crm.entity.GeneralEventRegistration;
import com.mosque.crm.entity.GeneralEventRegistrationAnswer;
import com.mosque.crm.enums.GeneralEventQuestionType;
import com.mosque.crm.repository.GeneralEventQuestionOptionRepository;
import com.mosque.crm.repository.GeneralEventQuestionRepository;
import com.mosque.crm.repository.GeneralEventRegistrationAnswerRepository;

/**
 * Manages the configurable registration questions attached to general events and the
 * answers registrants give to them.
 * <p>
 * Question definitions are persisted via {@link #replaceQuestionsForEvent(GeneralEvent, List)}
 * (id-preserving upsert so existing answers stay linked). Answers are saved through
 * {@link #saveAnswers(GeneralEvent, GeneralEventRegistration, List)} from both the admin
 * and public self-registration paths.
 */
@Service
public class GeneralEventQuestionService {

    private static final Logger log = LoggerFactory.getLogger(GeneralEventQuestionService.class);

    private final GeneralEventQuestionRepository questionRepository;
    private final GeneralEventQuestionOptionRepository optionRepository;
    private final GeneralEventRegistrationAnswerRepository answerRepository;

    public GeneralEventQuestionService(
            GeneralEventQuestionRepository questionRepository,
            GeneralEventQuestionOptionRepository optionRepository,
            GeneralEventRegistrationAnswerRepository answerRepository) {
        this.questionRepository = questionRepository;
        this.optionRepository = optionRepository;
        this.answerRepository = answerRepository;
    }

    // ========================
    // Question definitions
    // ========================

    /**
     * Replaces the question definitions of an event with the given DTOs, preserving ids of
     * existing questions/options where possible so that already collected answers stay valid.
     * Questions or options that already have answers cannot be removed.
     *
     * @throws IllegalArgumentException when a required label is missing, an unsupported type
     *                                  is used, or a question/option with answers is removed
     */
    @Transactional
    public void replaceQuestionsForEvent(GeneralEvent event, List<GeneralEventQuestionDTO> dtos) {
        List<GeneralEventQuestionDTO> incoming = dtos == null ? new ArrayList<>() : dtos;
        List<GeneralEventQuestion> existing = questionRepository
                .findByGeneralEventIdOrderBySortOrderAscIdAsc(event.getId());

        Map<Long, GeneralEventQuestion> existingById = new HashMap<>();
        for (GeneralEventQuestion q : existing) {
            existingById.put(q.getId(), q);
        }

        Set<Long> keptIds = new HashSet<>();
        int order = 0;
        for (GeneralEventQuestionDTO dto : incoming) {
            if (trimToNull(dto.getLabel()) == null) {
                throw new IllegalArgumentException("Every registration question needs a label");
            }
            GeneralEventQuestionType type = parseType(dto.getInputType());

            GeneralEventQuestion q;
            boolean isNew = dto.getId() == null || !existingById.containsKey(dto.getId());
            if (isNew) {
                q = new GeneralEventQuestion();
                q.setGeneralEvent(event);
                q.setOrganizationId(event.getOrganizationId());
            } else {
                q = existingById.get(dto.getId());
            }

            q.setLabel(dto.getLabel().trim());
            q.setInputType(type);
            q.setRequired(dto.isRequired());
            q.setSortOrder(order++);
            syncOptions(q, type, dto.getOptions() == null ? new ArrayList<>() : dto.getOptions());

            if (isNew) {
                questionRepository.save(q);
            }
            keptIds.add(q.getId());
        }

        // Remove questions that are no longer present
        for (GeneralEventQuestion q : existing) {
            if (!keptIds.contains(q.getId())) {
                if (answerRepository.countByQuestionId(q.getId()) > 0) {
                    throw new IllegalArgumentException(
                            "Question \"" + q.getLabel() + "\" already has answers and cannot be removed");
                }
                questionRepository.delete(q);
                log.info("Removed registration question id={} from event id={}", q.getId(), event.getId());
            }
        }
    }

    private void syncOptions(GeneralEventQuestion q, GeneralEventQuestionType type,
            List<GeneralEventQuestionOptionDTO> optionDtos) {
        // Free-text questions never carry options
        if (type == GeneralEventQuestionType.FREE_TEXT) {
            q.getOptions().clear();
            return;
        }

        Map<Long, GeneralEventQuestionOption> existingById = new HashMap<>();
        for (GeneralEventQuestionOption o : q.getOptions()) {
            existingById.put(o.getId(), o);
        }

        Set<Long> keptOptionIds = new HashSet<>();
        int order = 0;
        for (GeneralEventQuestionOptionDTO odto : optionDtos) {
            if (trimToNull(odto.getLabel()) == null) {
                throw new IllegalArgumentException("Every question option needs a label");
            }
            GeneralEventQuestionOption o;
            boolean isNew = odto.getId() == null || !existingById.containsKey(odto.getId());
            if (isNew) {
                o = new GeneralEventQuestionOption();
                o.setQuestion(q);
                o.setOrganizationId(q.getOrganizationId());
                q.getOptions().add(o);
            } else {
                o = existingById.get(odto.getId());
            }
            o.setLabel(odto.getLabel().trim());
            o.setSortOrder(order++);
            keptOptionIds.add(o.getId());
        }

        // Remove options no longer present (protect answered ones)
        List<GeneralEventQuestionOption> toRemove = new ArrayList<>();
        for (GeneralEventQuestionOption o : existingById.values()) {
            if (!keptOptionIds.contains(o.getId())) {
                if (answerRepository.countByQuestionIdAndOptionId(q.getId(), o.getId()) > 0) {
                    throw new IllegalArgumentException(
                            "Option \"" + o.getLabel() + "\" already has answers and cannot be removed");
                }
                toRemove.add(o);
            }
        }
        q.getOptions().removeAll(toRemove);
    }

    // ========================
    // Answers
    // ========================

    /**
     * Replaces the answers of a registration based on the event's current questions.
     * Validates that all required questions are answered and that supplied options belong
     * to the question they reference.
     */
    @Transactional
    public void saveAnswers(GeneralEvent event, GeneralEventRegistration reg,
            List<GeneralEventQuestionAnswerDTO> dtos) {
        List<GeneralEventQuestion> questions = questionRepository
                .findByGeneralEventIdOrderBySortOrderAscIdAsc(event.getId());
        if (questions.isEmpty()) {
            reg.getAnswers().clear();
            return;
        }

        Map<Long, GeneralEventQuestion> byId = new HashMap<>();
        for (GeneralEventQuestion q : questions) {
            byId.put(q.getId(), q);
        }

        Map<Long, GeneralEventQuestionAnswerDTO> provided = new LinkedHashMap<>();
        if (dtos != null) {
            for (GeneralEventQuestionAnswerDTO dto : dtos) {
                if (dto.getQuestionId() != null) {
                    if (!byId.containsKey(dto.getQuestionId())) {
                        throw new IllegalArgumentException(
                                "Answer references a question that does not belong to this event");
                    }
                    provided.put(dto.getQuestionId(), dto);
                }
            }
        }

        List<GeneralEventRegistrationAnswer> newAnswers = new ArrayList<>();
        for (GeneralEventQuestion q : questions) {
            GeneralEventQuestionAnswerDTO answer = provided.get(q.getId());
            switch (q.getInputType()) {
                case FREE_TEXT -> {
                    String text = trimToNull(answer != null ? answer.getFreeText() : null);
                    if (q.isRequired() && text == null) {
                        throw new IllegalArgumentException(
                                "A required question was not answered: " + q.getLabel());
                    }
                    if (text != null) {
                        newAnswers.add(buildAnswer(reg, q, null, text));
                    }
                }
                case SINGLE_CHOICE -> {
                    List<Long> ids = selectedOptionIds(answer);
                    if (ids.size() > 1) {
                        throw new IllegalArgumentException(
                                "Only one option can be selected for: " + q.getLabel());
                    }
                    if (q.isRequired() && ids.isEmpty()) {
                        throw new IllegalArgumentException(
                                "A required question was not answered: " + q.getLabel());
                    }
                    if (!ids.isEmpty()) {
                        newAnswers.add(buildAnswer(reg, q, resolveOption(q, ids.get(0)), null));
                    }
                }
                case MULTI_CHOICE -> {
                    List<Long> ids = selectedOptionIds(answer);
                    if (q.isRequired() && ids.isEmpty()) {
                        throw new IllegalArgumentException(
                                "A required question was not answered: " + q.getLabel());
                    }
                    for (Long optionId : ids) {
                        newAnswers.add(buildAnswer(reg, q, resolveOption(q, optionId), null));
                    }
                }
            }
        }

        // Replace collection in place (Hibernate-managed on a persisted registration)
        reg.getAnswers().clear();
        reg.getAnswers().addAll(newAnswers);
    }

    private GeneralEventRegistrationAnswer buildAnswer(GeneralEventRegistration reg,
            GeneralEventQuestion q, GeneralEventQuestionOption option, String freeText) {
        GeneralEventRegistrationAnswer a = new GeneralEventRegistrationAnswer();
        a.setRegistration(reg);
        a.setQuestion(q);
        a.setOption(option);
        a.setFreeText(freeText);
        a.setOrganizationId(reg.getOrganizationId());
        return a;
    }

    private GeneralEventQuestionOption resolveOption(GeneralEventQuestion q, Long optionId) {
        GeneralEventQuestionOption option = optionRepository.findById(optionId)
                .orElseThrow(() -> new IllegalArgumentException("Unknown question option: " + optionId));
        if (option.getQuestion() == null || !q.getId().equals(option.getQuestion().getId())) {
            throw new IllegalArgumentException("Option does not belong to the question");
        }
        return option;
    }

    private List<Long> selectedOptionIds(GeneralEventQuestionAnswerDTO answer) {
        List<Long> ids = new ArrayList<>();
        if (answer != null && answer.getOptionIds() != null) {
            for (Long id : answer.getOptionIds()) {
                if (id != null && !ids.contains(id)) {
                    ids.add(id);
                }
            }
        }
        return ids;
    }

    // ========================
    // Mapping helpers
    // ========================

    public List<GeneralEventQuestionDTO> toQuestionDTOs(List<GeneralEventQuestion> questions) {
        List<GeneralEventQuestionDTO> out = new ArrayList<>();
        if (questions != null) {
            for (GeneralEventQuestion q : questions) {
                out.add(toQuestionDTO(q));
            }
        }
        return out;
    }

    public GeneralEventQuestionDTO toQuestionDTO(GeneralEventQuestion q) {
        GeneralEventQuestionDTO dto = new GeneralEventQuestionDTO();
        dto.setId(q.getId());
        dto.setLabel(q.getLabel());
        dto.setInputType(q.getInputType() != null ? q.getInputType().name() : null);
        dto.setRequired(q.isRequired());
        dto.setSortOrder(q.getSortOrder());
        List<GeneralEventQuestionOptionDTO> optionDtos = new ArrayList<>();
        for (GeneralEventQuestionOption o : q.getOptions()) {
            GeneralEventQuestionOptionDTO odto = new GeneralEventQuestionOptionDTO();
            odto.setId(o.getId());
            odto.setLabel(o.getLabel());
            odto.setSortOrder(o.getSortOrder());
            optionDtos.add(odto);
        }
        dto.setOptions(optionDtos);
        return dto;
    }

    /** Builds the read-model answers (question label + chosen values) for a registration. */
    public List<GeneralEventRegistrationAnswerDTO> toAnswerDTOs(GeneralEventRegistration reg) {
        // Group by question, preserving question order
        Map<Long, GeneralEventRegistrationAnswerDTO> byQuestion = new LinkedHashMap<>();
        Map<Long, Integer> order = new HashMap<>();
        for (GeneralEventRegistrationAnswer a : reg.getAnswers()) {
            if (a.getQuestion() == null) {
                continue;
            }
            Long qid = a.getQuestion().getId();
            GeneralEventRegistrationAnswerDTO dto = byQuestion.get(qid);
            if (dto == null) {
                dto = new GeneralEventRegistrationAnswerDTO();
                dto.setQuestionId(qid);
                dto.setQuestionLabel(a.getQuestion().getLabel());
                dto.setInputType(a.getQuestion().getInputType() != null
                        ? a.getQuestion().getInputType().name()
                        : null);
                byQuestion.put(qid, dto);
                order.put(qid, a.getQuestion().getSortOrder());
            }
            if (a.getOption() != null) {
                dto.getOptionIds().add(a.getOption().getId());
                dto.getValues().add(a.getOption().getLabel());
            } else if (trimToNull(a.getFreeText()) != null) {
                dto.setFreeText(a.getFreeText());
                dto.getValues().add(a.getFreeText());
            }
        }
        List<GeneralEventRegistrationAnswerDTO> out = new ArrayList<>(byQuestion.values());
        out.sort((x, y) -> Integer.compare(
                order.getOrDefault(x.getQuestionId(), 0),
                order.getOrDefault(y.getQuestionId(), 0)));
        return out;
    }

    // ========================
    // Summary / tally
    // ========================

    public List<GeneralEventQuestionSummaryDTO> getSummary(Long eventId) {
        List<GeneralEventQuestion> questions = questionRepository
                .findByGeneralEventIdOrderBySortOrderAscIdAsc(eventId);
        List<GeneralEventQuestionSummaryDTO> out = new ArrayList<>();
        for (GeneralEventQuestion q : questions) {
            GeneralEventQuestionSummaryDTO summary = new GeneralEventQuestionSummaryDTO();
            summary.setQuestionId(q.getId());
            summary.setQuestionLabel(q.getLabel());
            summary.setInputType(q.getInputType() != null ? q.getInputType().name() : null);

            List<GeneralEventRegistrationAnswer> answers = answerRepository.findByQuestionId(q.getId());
            Map<Long, Long> byOption = new HashMap<>();
            Set<Long> answeredRegistrations = new HashSet<>();
            for (GeneralEventRegistrationAnswer a : answers) {
                if (a.getOption() != null) {
                    byOption.merge(a.getOption().getId(), 1L, Long::sum);
                    answeredRegistrations.add(a.getRegistration() != null ? a.getRegistration().getId() : -1L);
                } else if (trimToNull(a.getFreeText()) != null) {
                    answeredRegistrations.add(a.getRegistration() != null ? a.getRegistration().getId() : -1L);
                }
            }

            List<GeneralEventQuestionTotalDTO> totals = new ArrayList<>();
            for (GeneralEventQuestionOption o : q.getOptions()) {
                GeneralEventQuestionTotalDTO total = new GeneralEventQuestionTotalDTO();
                total.setOptionId(o.getId());
                total.setOptionLabel(o.getLabel());
                total.setCount(byOption.getOrDefault(o.getId(), 0L));
                totals.add(total);
            }
            summary.setTotals(totals);
            summary.setAnsweredCount(answeredRegistrations.size());
            out.add(summary);
        }
        return out;
    }

    public boolean hasQuestions(Long eventId) {
        return questionRepository.countByGeneralEventId(eventId) > 0;
    }

    /** Removes every answer recorded for an event (used when the event is deleted). */
    @Transactional
    public void deleteAllAnswersForEvent(Long eventId) {
        answerRepository.deleteByEventId(eventId);
    }

    // ========================
    // Helpers
    // ========================

    private GeneralEventQuestionType parseType(String raw) {
        String normalized = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
        try {
            return GeneralEventQuestionType.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unsupported question type: " + raw);
        }
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
