/**
 * Applications Page
 * Enhanced with match scoring, status timeline, and messaging
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  Loader2,
  SortAsc,
  Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApplicationCard } from '@/components/application';
import { getMyApplications } from '@/api/services/application.service';
import type { ApplicationStatus } from '@/types/application';

const statusTabs: { value: ApplicationStatus | 'all'; label: string; count?: number }[] = [
  { value: 'all', label: 'All Applications' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REVIEWING', label: 'Reviewing' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'OFFER', label: 'Offers' },
];

export default function Applications() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'match'>('date');

  const { data, isLoading } = useQuery({
    queryKey: ['applications', activeTab !== 'all' ? activeTab : undefined],
    queryFn: () =>
      getMyApplications({
        status: activeTab !== 'all' ? activeTab : undefined,
        limit: 50,
      }),
  });

  const applications = data?.data || [];

  // Filter and sort
  const filteredApplications = applications
    .filter((app) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        app.job.title.toLowerCase().includes(query) ||
        app.job.companyName.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
      }
      // Sort by match score
      const scoreA = a.matchScore?.overall || 0;
      const scoreB = b.matchScore?.overall || 0;
      return scoreB - scoreA;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Applications</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage all your job applications
          </p>
        </div>
        <Button asChild>
          <Link to="/jobs">Browse Jobs</Link>
        </Button>
      </div>

      {/* Filters & Search */}
      <Card className="border border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by job title or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-full sm:w-48">
                <SortAsc className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="match">Sort by Match Score</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredApplications.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {filteredApplications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onViewDetails={() =>
                    navigate(`/application/${application.id}`)
                  }
                  onMessage={() =>
                    navigate(`/messages?userId=${application.recruiterId}`)
                  }
                />
              ))}
            </motion.div>
          ) : (
            <Card className="border border-border/50">
              <CardContent className="py-20 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery
                    ? 'No applications found'
                    : 'No applications yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? 'Try adjusting your search filters'
                    : 'Start applying to jobs to track your applications here'}
                </p>
                {!searchQuery && (
                  <Button asChild>
                    <Link to="/jobs">Browse Jobs</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
