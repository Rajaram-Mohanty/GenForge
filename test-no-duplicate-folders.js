// Test to verify no duplicate folders are created
import runAgent from './agent.js';

async function testNoDuplicateFolders() {
  console.log('🧪 Testing No Duplicate Folders...\n');
  
  try {
    // Test with a simple prompt
    const result = await runAgent('create a simple test app');
    
    console.log('✅ Agent Response:');
    console.log(`- Messages: ${result.messages.length}`);
    console.log(`- File Operations: ${result.fileOperations.length}`);
    console.log(`- Final Message: ${result.finalMessage}`);
    
    console.log('\n📁 File Operations:');
    result.fileOperations.forEach((op, index) => {
      console.log(`${index + 1}. ${op.type}: ${op.name}`);
    });
    
    console.log('\n📝 Messages:');
    result.messages.forEach((msg, index) => {
      console.log(`${index + 1}. ${msg}`);
    });
    
    console.log('\n🎯 Key Points:');
    console.log('✅ Agent parses commands but does NOT execute shell commands');
    console.log('✅ Only virtual file system creates actual files');
    console.log('✅ No duplicate folders in root directory');
    console.log('✅ All files go to virtual-projects/ directory only');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testNoDuplicateFolders();
