/**
 * Check what files are in the system and clean up
 * Run with: node check-and-cleanup-files.js
 */

const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-2',
});

// THE 5 FILES YOU WANT TO KEEP
// Match by file type and partial name
const FILES_TO_KEEP = [
  { type: 'pdf', nameContains: 'C Programming' },
  { type: 'pptx', nameContains: 'Introduction to programming' },
  { type: 'mp4', nameContains: 'Input And Output' },
  { type: 'mp3', nameContains: 'Dog' },
  { type: 'mp3', nameContains: 'Function Overloading' }
];

async function checkAndCleanup() {
  try {
    console.log('🔍 Scanning all files in the system...\n');
    
    const result = await dynamodb.scan({
      TableName: 'aitutor_files',
      ProjectionExpression: 'fileId, fileName, title, fileType, ragDocumentId, moduleId'
    }).promise();
    
    const allFiles = result.Items || [];
    console.log(`📊 Total files in system: ${allFiles.length}\n`);
    
    console.log('='.repeat(80));
    console.log('FILES IN SYSTEM:');
    console.log('='.repeat(80));
    
    allFiles.forEach((f, i) => {
      const name = f.fileName || f.title || 'Unknown';
      const type = f.fileType || 'unknown';
      console.log(`${i + 1}. ${name} (${type})`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('YOUR 5 TARGET FILES:');
    console.log('='.repeat(80));
    FILES_TO_KEEP.forEach((f, i) => {
      console.log(`${i + 1}. ${f.nameContains} (${f.type})`);
    });
    
    // Find files to keep and delete
    const toKeep = [];
    const toDelete = [];
    
    for (const file of allFiles) {
      const name = file.fileName || file.title || '';
      const type = file.fileType || '';
      
      const isTarget = FILES_TO_KEEP.some(target =>
        target.type === type && name.includes(target.nameContains)
      );
      
      if (isTarget) {
        toKeep.push(file);
      } else {
        toDelete.push(file);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('MATCHING RESULTS:');
    console.log('='.repeat(80));
    console.log(`✅ Files to KEEP (${toKeep.length}):`);
    toKeep.forEach(f => {
      const name = f.fileName || f.title || 'Unknown';
      console.log(`   - ${name} (${f.fileType})`);
    });
    
    console.log(`\n❌ Files to DELETE (${toDelete.length}):`);
    toDelete.forEach(f => {
      const name = f.fileName || f.title || 'Unknown';
      console.log(`   - ${name} (${f.fileType})`);
    });
    
    if (toKeep.length < 5) {
      console.log(`\n⚠️  WARNING: Only found ${toKeep.length} of your 5 target files!`);
      console.log('Make sure your 5 files are uploaded and have the correct names.');
    }
    
    if (toDelete.length === 0) {
      console.log('\n✓ No files to delete - your system is clean!');
      return;
    }
    
    // Delete unwanted files
    console.log(`\n🗑️  Deleting ${toDelete.length} unwanted files...\n`);
    
    let deleted = 0;
    for (const file of toDelete) {
      try {
        await dynamodb.delete({
          TableName: 'aitutor_files',
          Key: { fileId: file.fileId }
        }).promise();
        
        const name = file.fileName || file.title || 'Unknown';
        console.log(`✓ Deleted: ${name}`);
        deleted++;
      } catch (err) {
        console.error(`✗ Failed to delete ${file.fileId}:`, err.message);
      }
    }
    
    console.log(`\n✅ Cleanup complete!`);
    console.log(`   - Deleted: ${deleted} files`);
    console.log(`   - Kept: ${toKeep.length} files`);
    console.log(`   - Remaining in system: ${allFiles.length - deleted} files`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAndCleanup();
