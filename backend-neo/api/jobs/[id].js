import { jobs } from '../generate/pipeline.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = request.query;
  
  if (typeof id !== 'string') {
    return response.status(400).json({ error: 'Invalid job ID' });
  }

  try {
    const job = jobs.get(id);
    
    if (!job) {
      return response.status(404).json({ error: 'Job not found' });
    }

    // Return job status with all necessary fields
    response.status(200).json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      currentStage: job.currentStage,
      createdAt: job.createdAt,
      result: job.result,
      error: job.error,
      audioUrl: job.audioUrl,
      videoUrls: job.videoUrls,
      plan: job.result?.plan
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    response.status(500).json({ error: 'Failed to get job' });
  }
}