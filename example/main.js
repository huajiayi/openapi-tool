const {generateService} = require('../dist/main')
const {resolve} = require('path')

// const url = 'http://192.168.11.40:7300/mock/6093b81a9055d00017a6a31b/swagger';
// const url = 'http://localhost:8080/api/v3/api-docs';
const url = 'https://gw.alipayobjects.com/os/antfincdn/M%24jrzTTYJN/oneapi.json';
const outputDir = resolve(__dirname, 'service');
generateService({url, outputDir})