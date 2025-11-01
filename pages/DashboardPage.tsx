


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { JobLog } from '../lib/types';
import PageHeader from '../components/PageHeader';
import Button from '../components/ui/Button';
// FIX: Changed import path to point to .tsx file.
import { cn } from '../lib/utils';

// Icons
const RefreshCwIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
);
const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);

function DashboardPage() {
    const [jobs, setJobs] = useState<JobLog[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        try {
            const history = JSON.parse(localStorage.getItem('museforge_job_history') || '[]');
            setJobs(history);
        } catch (e) {
            console.error("Failed to load job history:", e);
            setJobs([]);
        }
    }, []);

    const handleRemix = (job: JobLog) => {
        navigate('/', { state: { jobToRemix: job } });
    };

    const handleClearHistory = () => {
        if (window.confirm('Are you sure you want to clear your entire job history? This cannot be undone.')) {
            localStorage.removeItem('museforge_job_history');
            setJobs([]);
        }
    };

    return (
        <div className="flex-1 flex flex-col p-4 md:p-8 space-y-8">
            <PageHeader
                title="Dashboard"
                description="Review your previously generated tracks and videos."
            />

            {jobs.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center bg-secondary/30 rounded-lg border border-dashed border-border">
                    <div>
                        <h3 className="text-lg font-semibold">No jobs yet!</h3>
                        <p className="text-muted-foreground mt-1">
                            Go to the "Create New Music" page to generate your first track.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                     <div className="text-right">
                        <Button variant="destructive" size="sm" onClick={handleClearHistory}>
                            Clear History
                        </Button>
                    </div>
                    <div className="border border-border rounded-lg bg-secondary/80">
                        <div className="w-full overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-border">
                                    <tr className="text-left">
                                        <th className="p-4 font-medium">Title & Prompt</th>
                                        <th className="p-4 font-medium hidden md:table-cell">Details</th>
                                        <th className="p-4 font-medium hidden lg:table-cell">Created</th>
                                        <th className="p-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobs.map((job) => (
                                        <tr key={job.id} className="border-b border-border/50 last:border-b-0 hover:bg-secondary/50">
                                            <td className="p-4 align-top">
                                                <p className="font-semibold text-foreground">{job.finalPlan?.plan?.title || 'Untitled Track'}</p>
                                                <p className="text-muted-foreground text-xs truncate max-w-xs">{job.prompt || 'No prompt'}</p>
                                            </td>
                                            <td className="p-4 align-top hidden md:table-cell">
                                                <div className="flex flex-wrap gap-1">
                                                    {(job.genres || []).map(g => (
                                                        <span key={g} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{g}</span>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">{job.duration}s</p>
                                            </td>
                                            <td className="p-4 align-top hidden lg:table-cell text-muted-foreground">
                                                {new Date(job.createdAt).toLocaleString()}
                                            </td>
                                            <td className="p-4 align-top text-right">
                                                <div className="flex justify-end items-center gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => handleRemix(job)}>
                                                        <RefreshCwIcon className="h-4 w-4 mr-2" />
                                                        Remix
                                                    </Button>
                                                     <a 
                                                        href={job.audioUrl || '#'} 
                                                        download={`${job.finalPlan?.plan?.title || 'track'}.wav`}
                                                        title={`Download ${job.finalPlan?.plan?.title || 'track'}`}
                                                        aria-label={`Download ${job.finalPlan?.plan?.title || 'track'}`}
                                                    >
                                                        <Button variant="outline" size="icon" disabled={!job.audioUrl}>
                                                            <DownloadIcon className="h-4 w-4" />
                                                        </Button>
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardPage;