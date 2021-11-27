const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

const client = new Client({ puppeteer: { headless: true }, session: sessionCfg });

client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr);
});

client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function(err) {
        if (err) {
            console.error(err);
        }
    });
});


client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessfull
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
    console.log('Client is ready!');
});

// client.on('message', msg => {
//     if (msg.body == '!ping') {
//         msg.reply('pong');
//     }
// });


client.on('message', async msg => {
    console.log('MESSAGE RECEIVED', msg);

    if (msg.body === '!ping reply') {
        // Send a new message as a reply to the current one
        msg.reply('pong');

    } else if (msg.body === '!cmd') {
        // Send a new message to the same chat
        client.sendMessage(msg.from, `Berikut Perintah yang dapat anda gunakan :
!cmd untuk melihat command yang tersedia
!greating untuk mendapat balasan good morning 
!ping untuk mendapat balasan pong 
'Here\'s your requested testing`);


    } else if (msg.body === '!ping') {
        // Send a new message to the same chat
        client.sendMessage(msg.from, 'pong');

    } else if (msg.body === '!greating') {
        // Send a new message to the same chat
        client.sendMessage(msg.from, 'Selamat Pagi');

    };
});

// client.on('message', msg => {
//     if (msg.body == '!cmd') {
//         msg.reply('!ping untuk mendapat balasan pong');
//         msg.reply('!cmd untuk melihat command yang tersedia');
//         msg.reply('!greating untuk mendapat balasan good morning');
//     }
// });

client.initialize();