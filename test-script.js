const http = require('http');

async function test() {
  const fetch = (await import('node-fetch')).default;
  console.log('Testing /api/menu/post-process...');
  
  const dummyAIJson = {
    menu: [
      {
        name: 'Pizza',
        variants: [
          { groupName: 'Size', type: 'radio', required: true, options: [
            { name: 'Small', price: 199 },
            { name: 'Medium', price: 299 },
            { name: 'Large', price: 399 }
          ]}
        ]
      }
    ]
  };

  const res = await fetch('http://localhost:3000/api/menu/post-process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dummyAIJson)
  });
  
  const data = await res.json();
  console.log("Post Process result:", JSON.stringify(data, null, 2));
}
test().catch(console.error);
