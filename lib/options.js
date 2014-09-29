/*
 * mongo-edu
 *
 * Copyright (c) 2014 Przemyslaw Pluta
 * Licensed under the MIT license.
 * https://github.com/przemyslawpluta/mongo-edu/blob/master/LICENSE
 */

var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    inquirer = require('inquirer'),
    Table = require('easy-table'),
    prompts = require('./prompts'),
    yargs = require('yargs')
    .usage('Usage: $0 [options]')
    .describe('d', 'download path').describe('u', 'email address')
    .describe('h', 'switch from videos (default) to handouts').boolean('h')
    .describe('py', 'py switch').describe('py', 'switch to point to Python')
    .describe('proxy', 'pass proxy').describe('proxy', 'pass proxy switch for video download')
    .describe('test', 'proxy test').describe('test', 'use with --proxy to test if usable')
    .describe('save', 'save presets').describe('save', 'save presets')
    .describe('load', 'load presets').describe('load', 'load presets')
    .describe('cw', 'switch from wiki\'s video lists (default) to courseware').boolean('cw')
    .describe('cwd', 'same as --cw and dumps list of videos to file in -d').boolean('cwd')
    .describe('cc', 'get closed captions').boolean('cc')
    .describe('hq', 'get high quality videos').boolean('hq')
    .describe('ncc', 'no check certificate').boolean('ncc')
    .describe('uz', 'unzip handout files').boolean('uz')
    .describe('co', 'sequence video files in order of the courseware').boolean('co')
    .describe('verbose', 'print debug information').boolean('verbose')
    .example('$0 -d your_download_path', 'download videos from wiki')
    .example('$0 -d your_download_path -u your_user_name --cw --hq --cc', 'download high quality videos from courseware with closed captions')
    .example('$0 -d your_download_path -u your_user_name --cw --hq --cc --save myvideo', 'save all options under `myvideo` preset and run')
    .example('$0 -d your_download_path --load', 'select and run from available presets')
    .example('$0 -d your_download_path -h --uz', 'download and unzip handouts')
    .example('$0 -d your_download_path --cw --verbose', 'download videos from courseware and print debug info')
    .example('$0 -d your_download_path --cw --proxy http://proxy_ip_address:proxy_port_number', 'download videos from courseware via proxy tunnel')
    .example('$0 -d your_download_path --proxy http://proxy_ip_address:proxy_port_number --test', 'test proxy and download video via proxy tunnel')
    .demand('d');

var base = {},
    optionsPath = path.join(__dirname, '..', '/bin/args.json');

function readFromPath(callback) {

    'use strict';

    fs.readFile(optionsPath, function readFile(err, data) {
        if (err !== null) { return callback(err); }
        callback(null, JSON.parse(data));
    });
}

function saveToPath() {

    'use strict';

    fs.writeFile(optionsPath, JSON.stringify(base), 'utf-8', function writeFile(err) {
        if (err !== null) { return console.log('i'.red + ' Save Error: ' + err.stack); }
    });
}

function saveOptions(name) {

    'use strict';

    var handleRead = function handleRead(err, data) {
        if (err !== null) { return console.log('i'.red + ' Unable To Read File: ' + err.stack); }
        base = data;
        base[name] = _.omit(yargs.argv, 'save', 'load', 'd', '_', '$0');
        saveToPath();
    };

    fs.exists(optionsPath, function isFound(exists) {
        if (!exists) {
            base[name] = _.omit(yargs.argv, 'save', 'load', 'd', '_', '$0');
            return saveToPath();
        }
        readFromPath(handleRead);
    });
}

function loadOptions(name, callback) {

    'use strict';

    if (typeof name === 'function') { callback = name; }

    fs.exists(optionsPath, function isFound(exists) {
        if (!exists) { return callback(null, []); }
        readFromPath(function read(err, data) {
            if (typeof name !== 'function') {
                var status = !!data[name];
                return callback(err, _.omit(_.defaults(data[name], yargs.argv), 'save', 'load'), status);
            }
            callback(null, Object.keys(data));
        });
    });
}

function promptAsk(data, argv, initRun) {

    'use strict';

    inquirer.prompt(prompts.loadPreset(data), function prompt(answers) {
        loadOptions(answers.preset, function load(err, data, status) {
            if (err !== null || !status) { return console.log('i'.red + ' Unable To Load Preset: ' + argv.load); }
            initRun(data);
        });
    });
}

function showSign(item, rev) {

    'use strict';
    if (!item) { return ''; }
    if (typeof item !== 'boolean') { return item; }
    if (!rev) { return (item) ? '    x' : ''; }
    return (item) ? '' : '    x';
}

function checkIfFilled(item, name, target, clear) {

    'use strict';

    var i;
    for (i = 0; i < item.length; i++) {
        if (item[i][name] !== '') { clear.push(target); break; }
    }
}

function showPresets(argv, initRun, checkIfLoad) {

    'use strict';

    readFromPath(function read(err, data) {
        if (err !== null) { return console.log('i'.red + ' No Presets Found.'); }
        var items = _.values(data), presets = _.keys(data), count = 0, t = new Table, i, names = [], clear = [];

        items.forEach(function each(item) {
            t.cell('Preset', presets[count]);
            t.cell('User', item.u);
            t.cell('Wiki List', showSign(item.cw, true));
            t.cell('Courseware', showSign(item.cw));
            t.cell('HQ Video', showSign(item.hq));
            t.cell('CC', showSign(item.cc));
            t.cell('Seq Order', showSign(item.co));
            t.cell('Dump List', showSign(item.cwd));
            t.cell('Handouts', showSign(item.h));
            t.cell('UnZip', showSign(item.uz));
            t.cell('Debug', showSign(item.verbose));
            t.cell('PY NCC', showSign(item.ncc));
            t.cell('PY', showSign(item.py));
            t.cell('Proxy', showSign(item.proxy));
            t.cell('Proxy Test', showSign(item.test));
            if (count === 0) { names = _.keys(t._row); }
            count = count + 1;
            t.newRow();
        });

        for (i = 0; i < names.length; i++) {
            checkIfFilled(t.rows, names[i], i, clear);
        }

        clear = clear.map(function map(item) { return names[item]; });

        for (i = 0; i < t.rows.length; i++) {
            t.rows[i] = _.pick(t.rows[i], clear);
        }

        t.columns = _.pick(t.columns, clear);

        console.log(t.toString());

        argv.load = true;

        checkIfLoad(_.omit(argv, 'save'), initRun);

    });
}

module.exports = (function init() {

    'use strict';

    return {
        build: function build() { return yargs; },
        checkIfLoad: function checkIfLoad(argv, initRun) {
            if (!argv.load) { return initRun(argv); }
            if (typeof argv.load === 'string') {
                if (argv.load === '..') { return showPresets(argv, initRun, checkIfLoad); }
                loadOptions(argv.load, function load(err, data, status) {
                    if (err !== null || !status) { return console.log('i'.red + ' Preset: ' + argv.load.green + ' not found.'); }
                    initRun(data);
                });
            } else {
                loadOptions(function get(err, data) {
                    if (err !== null || !data.length) { return console.log('i'.magenta + ' No Presets Found.'); }
                    promptAsk(data, argv, initRun);
                });
            }
        },
        checkIfSave: function checkIfSave(argv, initAndConfigure, profile) {
            if (argv.save) {
                if (typeof argv.save === 'string') {
                    if (argv.save !== '..') { saveOptions(argv.save); }
                } else {
                    return inquirer.prompt(prompts.savePreset, function savePreset(answers) {
                        argv.save = answers.save;
                        saveOptions(answers.save);
                        initAndConfigure(profile, argv);
                    });
                }
            }
            initAndConfigure(profile, argv);
        }
    };

}());