import { ProjectService } from './dist/user-service/src/domain/project.service.js';
import { prisma } from './dist/user-service/src/prisma/client.js';
import { rabbitmqPublisher } from './dist/user-service/src/rabbitmq/publisher.js';

async function forceTrigger() {
  const projectId = '69677c175c2c0d72c6f2ce44';
  const userId = '696692ab33422e64c7d34948';

  console.log('DEBUG: Node Env:', process.env.NODE_ENV);
  console.log('DEBUG: RabbitMQ URL:', process.env.RABBITMQ_URL);

  console.log(`Re-triggering analysis for project ${projectId}...`);

  await rabbitmqPublisher.connect();
  console.log('RabbitMQ connected');

  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    console.error('Project not found');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { githubAccessToken: true }
  });

  console.log('Publishing message...');
  // Manual publish to see logs
  const result = await rabbitmqPublisher.publishAnalyzeRequest({
    projectId: project.id,
    userId,
    repoUrl: project.githubRepoUrl,
    repoName: project.repoName,
    defaultBranch: 'main',
    basePath: project.basePath || undefined,
    githubToken: user?.githubAccessToken || undefined
  });

  if (result) {
    console.log('Successfully re-triggered analysis!');
  } else {
    console.error('FAILED TO PUBLISH');
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  await rabbitmqPublisher.close();
  process.exit(0);
}

forceTrigger().catch(err => {
  console.error('CRITICAL FAILED:', err);
  process.exit(1);
});
