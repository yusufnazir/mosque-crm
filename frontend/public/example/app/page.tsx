"use client"

import { useState } from "react"
import { InboxSidebar } from "@/components/inbox-sidebar"
import { MessageList } from "@/components/message-list"
import { MessageDetail } from "@/components/message-detail"
import { emails, type Email } from "@/lib/email-data"

export default function InboxPage() {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(emails[0])
  const [activeFolder, setActiveFolder] = useState("inbox")

  return (
    <div className="flex h-screen bg-background">
      <InboxSidebar activeFolder={activeFolder} onFolderChange={setActiveFolder} />
      <MessageList
        emails={emails}
        selectedEmail={selectedEmail}
        onSelectEmail={setSelectedEmail}
      />
      <MessageDetail email={selectedEmail} />
    </div>
  )
}
