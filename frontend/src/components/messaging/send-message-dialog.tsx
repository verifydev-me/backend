/**
 * Send Message Dialog Component
 * Premium dialog for recruiters to send messages to candidates
 */

import { useState } from 'react'
import { useRecruiterStore } from '@/store/recruiter-store'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from '@/hooks/use-toast'
import { post } from '@/api/client'
import {
    Send,
    Loader2,
    MessageSquare,
    Sparkles,
    X,
} from 'lucide-react'

interface SendMessageDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    candidateId: string
    candidateName: string
    candidateAvatar?: string
    jobId?: string
    jobTitle?: string
}

export function SendMessageDialog({
    open,
    onOpenChange,
    candidateId,
    candidateName,
    candidateAvatar,
    jobId,
    jobTitle,
}: SendMessageDialogProps) {
    const { recruiter } = useRecruiterStore()
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const [isSending, setIsSending] = useState(false)

    const handleSend = async () => {
        if (!subject.trim() || !body.trim()) {
            toast({
                title: 'Missing fields',
                description: 'Please fill in both subject and message',
                variant: 'destructive',
            })
            return
        }

        setIsSending(true)
        try {
            await post('/v1/messages', {
                candidateId,
                receiverName: candidateName,
                senderName: recruiter?.name || recruiter?.organizationName,
                subject: subject.trim(),
                body: body.trim(),
                jobId,
            })

            toast({
                title: 'Message sent! 🎉',
                description: `Your message has been sent to ${candidateName}`,
            })

            // Reset form and close
            setSubject('')
            setBody('')
            onOpenChange(false)
        } catch (error: any) {
            toast({
                title: 'Failed to send message',
                description: error?.response?.data?.message || error?.message || 'Please try again',
                variant: 'destructive',
            })
        } finally {
            setIsSending(false)
        }
    }

    const handleClose = () => {
        if (!isSending) {
            setSubject('')
            setBody('')
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] bg-black/90 backdrop-blur-2xl border-white/10">
                {/* Premium gradient header */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />

                <DialogHeader className="pb-4">
                    <DialogTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/20">
                            <MessageSquare className="w-5 h-5 text-violet-400" />
                        </div>
                        <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                            Send Message
                        </span>
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Compose a message to this candidate
                    </DialogDescription>
                </DialogHeader>

                {/* Recipient info */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 mb-4">
                    <div className="relative">
                        <Avatar className="w-12 h-12 border-2 border-violet-500/30">
                            <AvatarImage src={candidateAvatar} />
                            <AvatarFallback className="bg-gradient-to-br from-violet-500/20 to-pink-500/20 text-lg font-semibold">
                                {candidateName[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold">{candidateName}</p>
                        <p className="text-sm text-muted-foreground">Candidate</p>
                    </div>
                    {jobTitle && (
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">Regarding</p>
                            <p className="text-sm font-medium text-violet-400">{jobTitle}</p>
                        </div>
                    )}
                </div>

                {/* Message form */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="subject" className="text-sm font-medium">
                            Subject
                        </Label>
                        <Input
                            id="subject"
                            placeholder="e.g., Exciting opportunity at our company..."
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="bg-white/5 border-white/20 focus:border-violet-500/50 focus:ring-violet-500/20 rounded-xl"
                            disabled={isSending}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="body" className="text-sm font-medium">
                            Message
                        </Label>
                        <Textarea
                            id="body"
                            placeholder="Write your message here..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="min-h-[150px] bg-white/5 border-white/20 focus:border-violet-500/50 focus:ring-violet-500/20 rounded-xl resize-none"
                            disabled={isSending}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {body.length}/2000 characters
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-3 pt-4">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSending}
                        className="bg-white/5 border-white/20 hover:bg-white/10 rounded-xl"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={isSending || !subject.trim() || !body.trim()}
                        className="relative overflow-hidden group bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-xl shadow-violet-500/25 rounded-xl"
                    >
                        {/* Shine effect */}
                        <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                        {isSending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Message
                                <Sparkles className="w-3 h-3 ml-2 opacity-75" />
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default SendMessageDialog
