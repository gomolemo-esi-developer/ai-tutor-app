const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-2' });

dynamodb.scan({
  TableName: 'aitutor_files',
  ProjectionExpression: 'fileId, fileName, ragDocumentId, ragProcessingStatus'
}).promise().then(result => {
  console.log('Files with RAG status:');
  result.Items.forEach(f => {
    console.log(`${f.fileName || 'Unknown'}`);
    console.log(`  - ragDocumentId: ${f.ragDocumentId || 'NOT SET'}`);
    console.log(`  - ragProcessingStatus: ${f.ragProcessingStatus || 'NOT SET'}`);
    console.log();
  });
}).catch(err => console.error(err));
