const { ProjectService } = require('./dist/domain/project.service.js');
const { prisma } = require('./dist/utils/prisma.js');

async function forceTrigger() {
  const projectId = '69677c175c2c0d72c6f2ce44';
  const userId = '696692ab33422e64c7d34948';

  console.log(`Re-triggering analysis for project ${projectId}...`);

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

  await ProjectService.triggerAnalysis(
    project.id,
    userId,
    project.githubRepoUrl,
    project.repoName,
    'main',
    undefined,
    user?.githubAccessToken || '',
    project.basePath || undefined
  );

  console.log('Successfully re-triggered analysis!');
  process.exit(0);
}

forceTrigger().catch(err => {
  console.error(err);
  process.exit(1);
});
