"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const ava_1 = require("ava");
const parser_1 = require("../core/parser");
const gitterMessage = require("./fixtures/gitter/message.json");
const gitterMessagePrivate = require("./fixtures/gitter/messagePrivate.json");
const broidMessage = require("./fixtures/broid/message.json");
const broidMessagePrivate = require("./fixtures/broid/messagePrivate.json");
let parser;
ava_1.default.before(() => {
    parser = new parser_1.default("testuser", "info");
});
ava_1.default("Parse a group message", (t) => __awaiter(this, void 0, void 0, function* () {
    let data = yield parser.parse(gitterMessage);
    t.deepEqual(data, broidMessage);
}));
ava_1.default("Parse a private message", (t) => __awaiter(this, void 0, void 0, function* () {
    let data = yield parser.parse(gitterMessagePrivate);
    t.deepEqual(data, broidMessagePrivate);
}));
ava_1.default("Validate a group message", (t) => __awaiter(this, void 0, void 0, function* () {
    const data = parser.validate(broidMessage);
    t.deepEqual(yield data, broidMessage);
}));
ava_1.default("Validate a private message", (t) => __awaiter(this, void 0, void 0, function* () {
    const data = parser.validate(broidMessagePrivate);
    t.deepEqual(yield data, broidMessagePrivate);
}));
