// const { Client, LegacySessionAuth } = require('whatsapp-web.js');
const { Client, LocalAuth, Location, List, Buttons } = require('whatsapp-web.js');
// const qrcode = require('qrcode-terminal');
const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const fs = require('fs');
// const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
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

const client = new Client({
    puppeteer: {
        executablePath: '/usr/bin/brave-browser-stable',
    },
    authStrategy: new LocalAuth({
        clientId: "client-one"
    }),
    puppeteer: {
        headless: false,
    }
});

client.on('authenticated', (session) => {
    console.log('WHATSAPP WEB => Authenticated');
});


client.on('qr', qr => {
    qrcodeTerminal.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', msg => {
    if (msg.body == '!ping') {
        msg.reply('pong');
    }
});

client.initialize();



//fungsi
const checkRegisteredNumber = async function (number) {
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
}



// Send message
app.post('/send-message', [
    body('number').notEmpty(),
    body('message').notEmpty(),
], async (req, res) => {
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


//endfungsi




server.listen(port, function () {
    console.log('App running on *: ' + port);
});