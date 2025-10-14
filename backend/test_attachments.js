const http = require('http');
const { Client } = require('pg');

const client = new Client({
  user: 'chessslack',
  host: 'localhost',
  database: 'chessslack',
  password: 'chessslack_dev_password',
  port: 5432,
});

async function test() {
  await client.connect();

  const tokenResult = await client.query(
    "SELECT token FROM user_sessions WHERE expires_at > NOW() LIMIT 1"
  );

  if (tokenResult.rows.length === 0) {
    console.log('No valid session found');
    await client.end();
    return;
  }

  const token = tokenResult.rows[0].token;

  const msgResult = await client.query(
    "SELECT m.workspace_id, m.channel_id FROM messages m JOIN attachments a ON m.id = a.message_id LIMIT 1"
  );

  if (msgResult.rows.length === 0) {
    console.log('No messages with attachments found');
    await client.end();
    return;
  }

  const ws = msgResult.rows[0].workspace_id;
  const ch = msgResult.rows[0].channel_id;

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/workspaces/' + ws + '/channels/' + ch + '/messages?limit=20',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        const messagesWithAttachments = response.messages.filter(m => m.hasAttachments);

        console.log('Total messages: ' + response.messages.length);
        console.log('Messages with attachments: ' + messagesWithAttachments.length);

        if (messagesWithAttachments.length > 0) {
          const msg = messagesWithAttachments[0];
          console.log('First message with attachments:');
          console.log('- ID: ' + msg.id);
          console.log('- Has attachments: ' + msg.hasAttachments);
          console.log('- Attachments count: ' + (msg.attachments ? msg.attachments.length : 0));
          if (msg.attachments && msg.attachments.length > 0) {
            console.log('- First attachment:');
            console.log(JSON.stringify(msg.attachments[0], null, 2));
          }
        }
      } catch (e) {
        console.log('Error: ' + e.message);
      }
      client.end();
    });
  });

  req.on('error', (e) => {
    console.error('Error: ' + e.message);
    client.end();
  });

  req.end();
}

test();
