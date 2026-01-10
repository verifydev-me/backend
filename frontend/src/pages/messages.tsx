/**
 * Messages Page
 * Full chat interface for bi-directional messaging
 * Premium split-view design with conversations list and chat thread
 */

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/hooks/use-toast'
import { getInbox, getSentMessages, getConversation, sendMessage, getUnreadCount, markAsRead } from '@/api/services/message.service'
import { formatMessagePreview, getTimeAgo } from '@/api/services/message.service'
import {
    MessageSquare,
    Send,
    Loader2,
    Inbox,
    ArrowLeft,
    Check,
    CheckCheck,
    Search,
    MoreVertical,
    Sparkles,
} from 'lucide-react'

interface ConversationContact {
    id: string
    name: string
    email?: string
    avatarUrl?: string
    lastMessage?: string
    lastMessageTime?: string
    unreadCount: number
    isOnline?: boolean
}

export default function MessagesPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [selectedUserId, setSelectedUserId] = useState<string | null>(searchParams.get('userId'))
    const [messageText, setMessageText] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Fetch inbox messages to build conversation list
    const { data: inboxData, isLoading: inboxLoading } = useQuery({
        queryKey: ['messages', 'inbox'],
        queryFn: () => getInbox({ limit: 100 }),
    })

    // Fetch sent messages
    const { data: sentData } = useQuery({
        queryKey: ['messages', 'sent'],
        queryFn: () => getSentMessages({ limit: 100 }),
    })

    // Fetch conversation for selected user
    const { data: conversationData, isLoading: conversationLoading } = useQuery({
        queryKey: ['messages', 'conversation', selectedUserId],
        queryFn: () => getConversation(selectedUserId!),
        enabled: !!selectedUserId,
    })

    // Fetch unread count
    const { data: unreadData } = useQuery({
        queryKey: ['messages', 'unread-count'],
        queryFn: getUnreadCount,
    })

    // Send message mutation
    const sendMutation = useMutation({
        mutationFn: sendMessage,
        onSuccess: () => {
            setMessageText('')
            queryClient.invalidateQueries({ queryKey: ['messages'] })
            toast({
                title: 'Message sent',
                description: 'Your message has been delivered',
            })
        },
        onError: (error: any) => {
            toast({
                title: 'Failed to send',
                description: error?.response?.data?.message || 'Please try again',
                variant: 'destructive',
            })
        },
    })

    // Build conversation list from inbox and sent messages
    const conversations: ConversationContact[] = (() => {
        const contactsMap = new Map<string, ConversationContact>()

        // Process inbox messages
        inboxData?.forEach((msg: any) => {
            const senderId = msg.senderId
            const msgName = msg.sender?.name || msg.senderName
            if (!contactsMap.has(senderId)) {
                contactsMap.set(senderId, {
                    id: senderId,
                    name: msgName || 'Unknown User',
                    email: msg.sender?.email,
                    avatarUrl: msg.sender?.avatarUrl,
                    lastMessage: msg.content,
                    lastMessageTime: msg.sentAt || msg.createdAt,
                    unreadCount: msg.isRead ? 0 : 1,
                })
            } else {
                const existing = contactsMap.get(senderId)!
                // Update name if current is Unknown User and this message has a real name
                if (existing.name === 'Unknown User' && msgName) {
                    existing.name = msgName
                }
                if (!msg.isRead) existing.unreadCount++
                const msgTime = msg.sentAt || msg.createdAt
                if (new Date(msgTime) > new Date(existing.lastMessageTime || 0)) {
                    existing.lastMessage = msg.content
                    existing.lastMessageTime = msgTime
                }
            }
        })

        // Process sent messages
        sentData?.forEach((msg: any) => {
            const receiverId = msg.receiverId
            const msgName = msg.receiver?.name || msg.receiverName
            if (!contactsMap.has(receiverId)) {
                contactsMap.set(receiverId, {
                    id: receiverId,
                    name: msgName || 'Unknown User',
                    email: msg.receiver?.email,
                    avatarUrl: msg.receiver?.avatarUrl,
                    lastMessage: msg.content,
                    lastMessageTime: msg.sentAt || msg.createdAt,
                    unreadCount: 0,
                })
            } else {
                const existing = contactsMap.get(receiverId)!
                // Update name if current is Unknown User and this message has a real name
                if (existing.name === 'Unknown User' && msgName) {
                    existing.name = msgName
                }
                const msgTime = msg.sentAt || msg.createdAt
                if (new Date(msgTime) > new Date(existing.lastMessageTime || 0)) {
                    existing.lastMessage = msg.content
                    existing.lastMessageTime = msgTime
                }
            }
        })

        return Array.from(contactsMap.values())
            .sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime())
            .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    })()

    const selectedContact = conversations.find(c => c.id === selectedUserId)
    const messages = conversationData || []

    // Auto-scroll to bottom when new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Update URL when selection changes
    useEffect(() => {
        if (selectedUserId) {
            setSearchParams({ userId: selectedUserId })
        }
    }, [selectedUserId, setSearchParams])

    // Mark unread messages as read when viewing conversation
    useEffect(() => {
        if (conversationData && Array.isArray(conversationData)) {
            conversationData.forEach((msg: any) => {
                // Only mark as read if this message is sent TO us (we are the receiver) and it's unread
                if (!msg.isRead && msg.receiverId !== selectedUserId) {
                    markAsRead(msg.id).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['messages'] })
                    }).catch(console.error)
                }
            })
        }
    }, [conversationData, selectedUserId, queryClient])

    const handleSend = () => {
        if (!messageText.trim() || !selectedUserId) return

        sendMutation.mutate({
            receiverId: selectedUserId,
            content: messageText.trim(),
        })
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="min-h-[calc(100vh-120px)] flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/20">
                                <MessageSquare className="w-7 h-7 text-violet-500" />
                            </div>
                            Messages
                            {(unreadData?.data?.count ?? 0) > 0 && (
                                <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0">
                                    {unreadData?.data?.count} new
                                </Badge>
                            )}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Chat with recruiters and candidates
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Chat Container */}
            <Card className="flex-1 overflow-hidden border-0 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent backdrop-blur-xl border border-white/10">
                <div className="flex h-[600px]">
                    {/* Left Panel - Conversations List */}
                    <div className="w-80 border-r border-white/10 flex flex-col">
                        {/* Search */}
                        <div className="p-4 border-b border-white/10">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search conversations..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-white/5 border-white/10"
                                />
                            </div>
                        </div>

                        {/* Conversations */}
                        <ScrollArea className="flex-1">
                            {inboxLoading ? (
                                <div className="p-4 space-y-4">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <Skeleton className="w-12 h-12 rounded-full" />
                                            <div className="flex-1">
                                                <Skeleton className="h-4 w-24 mb-2" />
                                                <Skeleton className="h-3 w-32" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : conversations.length > 0 ? (
                                <div className="p-2">
                                    {conversations.map((contact) => (
                                        <motion.button
                                            key={contact.id}
                                            onClick={() => setSelectedUserId(contact.id)}
                                            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${selectedUserId === contact.id
                                                ? 'bg-gradient-to-r from-violet-500/20 to-pink-500/20 border border-violet-500/30'
                                                : 'hover:bg-white/5'
                                                }`}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <div className="relative">
                                                <Avatar className="w-12 h-12">
                                                    <AvatarImage src={contact.avatarUrl} />
                                                    <AvatarFallback className="bg-gradient-to-br from-violet-500/20 to-pink-500/20">
                                                        {contact.name[0]?.toUpperCase() || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {contact.isOnline && (
                                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                                                )}
                                            </div>
                                            <div className="flex-1 text-left overflow-hidden">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium truncate">{contact.name}</span>
                                                    {contact.lastMessageTime && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {getTimeAgo(contact.lastMessageTime)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-sm text-muted-foreground truncate">
                                                        {contact.lastMessage ? formatMessagePreview(contact.lastMessage, 30) : 'No messages'}
                                                    </span>
                                                    {contact.unreadCount > 0 && (
                                                        <Badge className="bg-violet-500 text-white text-xs h-5 min-w-5 flex items-center justify-center">
                                                            {contact.unreadCount}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                                        <Inbox className="w-8 h-8 text-violet-400" />
                                    </div>
                                    <p className="text-muted-foreground">No conversations yet</p>
                                    <p className="text-sm text-muted-foreground/70 mt-1">
                                        Your messages will appear here
                                    </p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Right Panel - Chat Thread */}
                    <div className="flex-1 flex flex-col">
                        {selectedUserId && selectedContact ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="lg:hidden"
                                            onClick={() => setSelectedUserId(null)}
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                        </Button>
                                        <Avatar className="w-10 h-10">
                                            <AvatarImage src={selectedContact.avatarUrl} />
                                            <AvatarFallback className="bg-gradient-to-br from-violet-500/20 to-pink-500/20">
                                                {selectedContact.name[0]?.toUpperCase() || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div
                                            className="cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => navigate(`/recruiter/candidates/${selectedUserId}`)}
                                        >
                                            <h3 className="font-semibold">{selectedContact.name}</h3>
                                            <p className="text-xs text-muted-foreground hover:text-violet-400 transition-colors">
                                                {selectedContact.email || 'Click to view profile'}
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="w-5 h-5" />
                                    </Button>
                                </div>

                                {/* Messages */}
                                <ScrollArea className="flex-1 p-4">
                                    {conversationLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                                        </div>
                                    ) : messages.length > 0 ? (
                                        <div className="space-y-4">
                                            <AnimatePresence>
                                                {messages.map((msg: any, idx: number) => {
                                                    const isSent = msg.senderId !== selectedUserId
                                                    return (
                                                        <motion.div
                                                            key={msg.id || idx}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                                                        >
                                                            <div
                                                                className={`max-w-[70%] rounded-2xl px-4 py-3 ${isSent
                                                                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                                                                    : 'bg-white/10 border border-white/10'
                                                                    }`}
                                                            >
                                                                {msg.subject && (
                                                                    <p className={`text-sm font-semibold mb-1 ${isSent ? 'text-white/90' : 'text-violet-400'}`}>
                                                                        {msg.subject}
                                                                    </p>
                                                                )}
                                                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                                <div className={`flex items-center justify-end gap-1 mt-2 ${isSent ? 'text-white/60' : 'text-muted-foreground'}`}>
                                                                    <span className="text-xs">
                                                                        {msg.sentAt ? getTimeAgo(msg.sentAt) : 'Just now'}
                                                                    </span>
                                                                    {isSent && (
                                                                        msg.isRead ? (
                                                                            <CheckCheck className="w-3 h-3 text-cyan-400" />
                                                                        ) : (
                                                                            <Check className="w-3 h-3" />
                                                                        )
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )
                                                })}
                                            </AnimatePresence>
                                            <div ref={messagesEndRef} />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-center">
                                            <Sparkles className="w-12 h-12 text-violet-400 mb-4" />
                                            <p className="text-muted-foreground">Start the conversation</p>
                                            <p className="text-sm text-muted-foreground/70 mt-1">
                                                Send a message to {selectedContact.name}
                                            </p>
                                        </div>
                                    )}
                                </ScrollArea>

                                {/* Message Composer */}
                                <div className="p-4 border-t border-white/10">
                                    <div className="flex items-center gap-3">
                                        <Input
                                            placeholder="Type your message..."
                                            value={messageText}
                                            onChange={(e) => setMessageText(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            disabled={sendMutation.isPending}
                                            className="flex-1 bg-white/5 border-white/10 focus:border-violet-500/50"
                                        />
                                        <Button
                                            onClick={handleSend}
                                            disabled={!messageText.trim() || sendMutation.isPending}
                                            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/25"
                                        >
                                            {sendMutation.isPending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* No conversation selected */
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500/20 via-pink-500/20 to-cyan-500/20 flex items-center justify-center mb-6">
                                    <MessageSquare className="w-12 h-12 text-violet-400" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                                <p className="text-muted-foreground max-w-sm">
                                    Choose a conversation from the list to view messages and continue chatting
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    )
}
