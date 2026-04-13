export interface Email {
  id: string
  from: {
    name: string
    email: string
    avatar?: string
  }
  to: string
  subject: string
  preview: string
  body: string
  date: string
  time: string
  read: boolean
  starred: boolean
  labels?: string[]
  attachments?: { name: string; size: string }[]
}

export const emails: Email[] = [
  {
    id: "1",
    from: {
      name: "Sarah Chen",
      email: "sarah.chen@company.com",
    },
    to: "me@example.com",
    subject: "Q2 Product Roadmap Review",
    preview: "Hey! I wanted to follow up on our discussion about the Q2 roadmap. I've attached the updated timeline...",
    body: `Hey!

I wanted to follow up on our discussion about the Q2 roadmap. I've attached the updated timeline with the changes we discussed yesterday.

Key highlights:
• Mobile app launch moved to April 15th
• New dashboard features prioritized for May
• API v2 release scheduled for end of June

Let me know if you have any questions or concerns about the new timeline.

Best,
Sarah`,
    date: "Today",
    time: "10:42 AM",
    read: false,
    starred: true,
    labels: ["work", "important"],
    attachments: [
      { name: "Q2-Roadmap-v2.pdf", size: "2.4 MB" },
    ],
  },
  {
    id: "2",
    from: {
      name: "Alex Rivera",
      email: "alex.r@design.io",
    },
    to: "me@example.com",
    subject: "Design System Updates",
    preview: "The new component library is ready for review. I've pushed all the changes to the staging environment...",
    body: `Hi team,

The new component library is ready for review. I've pushed all the changes to the staging environment.

What's new:
• Updated button variants with better accessibility
• New form components (inputs, selects, checkboxes)
• Improved dark mode support
• Motion design tokens

You can preview everything at staging.design.io/components

Looking forward to your feedback!

Alex`,
    date: "Today",
    time: "9:15 AM",
    read: false,
    starred: false,
    labels: ["design"],
  },
  {
    id: "3",
    from: {
      name: "Jordan Park",
      email: "jordan@startup.vc",
    },
    to: "me@example.com",
    subject: "Re: Partnership Opportunity",
    preview: "Thanks for getting back to me so quickly. I'd love to schedule a call this week to discuss further...",
    body: `Thanks for getting back to me so quickly. I'd love to schedule a call this week to discuss further.

I'm available:
• Tuesday 2-4 PM EST
• Wednesday 10 AM - 12 PM EST
• Thursday anytime after 3 PM EST

Let me know what works best for your schedule.

Cheers,
Jordan`,
    date: "Yesterday",
    time: "4:32 PM",
    read: true,
    starred: true,
    labels: ["partnerships"],
  },
  {
    id: "4",
    from: {
      name: "GitHub",
      email: "noreply@github.com",
    },
    to: "me@example.com",
    subject: "[company/repo] Pull request #142 merged",
    preview: "Pull request #142 from feature/auth-improvements was merged into main by @developer...",
    body: `Pull request #142 from feature/auth-improvements was merged into main by @developer.

Changes:
• Added OAuth 2.0 support
• Improved session management
• Updated security documentation

View the full diff: https://github.com/company/repo/pull/142`,
    date: "Yesterday",
    time: "2:18 PM",
    read: true,
    starred: false,
    labels: ["github"],
  },
  {
    id: "5",
    from: {
      name: "Marketing Team",
      email: "marketing@company.com",
    },
    to: "me@example.com",
    subject: "Newsletter Draft - Please Review",
    preview: "Hi! Please review the attached newsletter draft before we send it out on Friday. Key sections include...",
    body: `Hi!

Please review the attached newsletter draft before we send it out on Friday.

Key sections include:
• Product announcement teaser
• Customer success story
• Upcoming webinar invitation
• Team spotlight

Please share your feedback by Thursday EOD.

Thanks!
Marketing Team`,
    date: "Apr 8",
    time: "11:45 AM",
    read: true,
    starred: false,
    labels: ["marketing"],
    attachments: [
      { name: "Newsletter-April.docx", size: "1.2 MB" },
      { name: "Banner-Images.zip", size: "5.8 MB" },
    ],
  },
  {
    id: "6",
    from: {
      name: "Emily Watson",
      email: "emily.w@tech.co",
    },
    to: "me@example.com",
    subject: "Team Lunch Friday",
    preview: "Don't forget we have team lunch this Friday at 12:30 PM! We're going to that new place downtown...",
    body: `Hey everyone!

Don't forget we have team lunch this Friday at 12:30 PM! We're going to that new place downtown - The Kitchen Table.

Address: 123 Main St, Suite 100

Please let me know if you have any dietary restrictions I should inform the restaurant about.

See you there!
Emily`,
    date: "Apr 7",
    time: "3:22 PM",
    read: true,
    starred: false,
    labels: ["team"],
  },
  {
    id: "7",
    from: {
      name: "Stripe",
      email: "receipts@stripe.com",
    },
    to: "me@example.com",
    subject: "Your receipt from Company Inc.",
    preview: "Receipt for your payment of $49.00 to Company Inc. for Pro Plan Subscription...",
    body: `Receipt from Company Inc.

Amount paid: $49.00
Date: April 6, 2024
Payment method: Visa ending in 4242

Description: Pro Plan Subscription (Monthly)

Thank you for your business!

View receipt: https://dashboard.stripe.com/receipts/123`,
    date: "Apr 6",
    time: "9:00 AM",
    read: true,
    starred: false,
    labels: ["receipts"],
  },
]
