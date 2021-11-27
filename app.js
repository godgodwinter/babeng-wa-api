const { Client, MessageMedia } = require('whatsapp-web.js');
// const qrcode = require('qrcode-terminal');
const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const fs = require('fs');
const qrcode = require('qrcode');
const { body, validationResult } = require('express-validator');
const { phoneNumberFormatter } = require('./helpers/formatter');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');


const port = process.env.PORT || 8081;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.use(fileUpload({
    debug: true
}));


const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

// app.get('/', (req, res) => {
//     res.status(200).json({
//         status: true,
//         message: 'Hello modafaka'
//     });
// });

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname })
});


const client = new Client({
    restartOnAuthFail: true,
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // <- this one doesn't works in Windows
            '--disable-gpu'
        ],
    },
    session: sessionCfg
});

// client.on('qr', (qr) => {
//     // Generate and scan this code with your phone
//     console.log('QR RECEIVED', qr);
//     qrcode.generate(qr);
// });

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

// Socket IO
io.on('connection', function(socket) {
    socket.emit('message', 'Connecting...');

    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit('qr', url);
            socket.emit('message', 'QR Code received, scan please!');
        });
    });

    client.on('ready', () => {
        socket.emit('ready', 'Whatsapp is ready!');
        socket.emit('message', 'Whatsapp is ready!');
    });

    client.on('authenticated', (session) => {
        socket.emit('authenticated', 'Whatsapp is authenticated!');
        socket.emit('message', 'Whatsapp is authenticated!');
        console.log('AUTHENTICATED', session);
        sessionCfg = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function(err) {
            if (err) {
                console.error(err);
            }
        });
    });

    client.on('auth_failure', function(session) {
        socket.emit('message', 'Auth failure, restarting...');
    });

    client.on('disconnected', (reason) => {
        socket.emit('message', 'Whatsapp is disconnected!');
        console.log('Session file deleted!');
        // fs.unlinkSync(SESSION_FILE_PATH, function(err) {
        //     if (err) return console.log(err);
        //     console.log('Session file deleted!');
        // });
        // client.destroy();
        // client.initialize();
    });
});


//fungsi
const checkRegisteredNumber = async function(number) {
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
}



//endfungsi


// Send message
app.post('/send-message', [
    body('number').notEmpty(),
    body('message').notEmpty(),
], async(req, res) => {
    const errors = validationResult(req).formatWith(({
        msg
    }) => {
        return msg;
    });

    if (!errors.isEmpty()) {
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        });
    }

    const number = phoneNumberFormatter(req.body.number);
    const message = req.body.message;

    const isRegisteredNumber = await checkRegisteredNumber(number);

    if (!isRegisteredNumber) {
        return res.status(422).json({
            status: false,
            message: 'The number is not registered'
        });
    }

    client.sendMessage(number, message).then(response => {
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});


// //sendmediav1
// app.post('/send-media', async(req, res) => {
//     const number = phoneNumberFormatter(req.body.number);
//     const caption = req.body.caption;
//     // const fileUrl = req.body.file;

//     const media = MessageMedia.fromFilePath('./image-example.png');

//     client.sendMessage(number, media, {
//         caption: caption
//     }).then(response => {
//         res.status(200).json({
//             status: true,
//             response: response
//         });
//     }).catch(err => {
//         res.status(500).json({
//             status: false,
//             response: err
//         });
//     });
// });
// //sendmediav1

// //sendmediav2
// app.post('/send-media', async(req, res) => {
//     const number = phoneNumberFormatter(req.body.number);
//     const caption = req.body.caption;
//     // const fileUrl = req.body.file;

//     // const media = MessageMedia.fromFilePath('./image-example.png');
//     const file = req.files.file;
//     // console.log(file);
//     // return;
//     const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);

//     client.sendMessage(number, media, {
//         caption: caption
//     }).then(response => {
//         res.status(200).json({
//             status: true,
//             response: response
//         });
//     }).catch(err => {
//         res.status(500).json({
//             status: false,
//             response: err
//         });
//     });
// });
// //sendmediav2


//sendmediav3
app.post('/send-media', async(req, res) => {
    const number = phoneNumberFormatter(req.body.number);
    const caption = req.body.caption;
    const fileUrl = req.body.file;

    // const media = MessageMedia.fromFilePath('./image-example.png');
    // const file = req.files.file;
    // const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);
    let mimetype;
    const attachment = await axios.get(fileUrl, {
        responseType: 'arraybuffer'
    }).then(response => {
        mimetype = response.headers['content-type'];
        return response.data.toString('base64');
    });

    const media = new MessageMedia(mimetype, attachment, 'Media');

    client.sendMessage(number, media, {
        caption: caption
    }).then(response => {
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});
//sendmediav3




server.listen(port, function() {
    console.log('App running on *: ' + port);
});