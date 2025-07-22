"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const chai_1 = require("chai");
require("mocha");
const sinon = require("sinon");
const https_1 = require("firebase-functions/v2/https");
const index_1 = require("./index");
// Mock Firebase config
const firebaseTestConfig = {
    projectId: 'gefifi-demo-app',
    storageBucket: 'gefifi-audio-messages'
};
const testEnv = functions(firebaseTestConfig);
describe('Cloud Functions for Voice Messages', () => {
    let fileStub;
    let bucketStub;
    beforeEach(() => {
        // Stub Firestore
        const docStub = sinon.stub();
        docStub.withArgs('existingChat').returns({
            get: sinon.stub().resolves({
                exists: true,
                data: () => ({ participants: ['testUser'] })
            })
        });
        docStub.withArgs('nonexistentChat').returns({
            get: sinon.stub().resolves({ exists: false })
        });
        docStub.withArgs('chatWithoutUser').returns({
            get: sinon.stub().resolves({
                exists: true,
                data: () => ({ participants: ['anotherUser'] })
            })
        });
        sinon.stub(admin.firestore(), 'collection').returns({
            doc: docStub
        });
        // Stub Storage
        const fileExistsStub = sinon.stub();
        fileExistsStub.withArgs('nonexistent.webm').resolves([false]);
        fileExistsStub.resolves([true]); // Default to true for any other file
        const getSignedUrlStub = sinon.stub().resolves(['http://fake.url/signed-url']);
        fileStub = sinon.stub().returns({
            exists: fileExistsStub,
            getSignedUrl: getSignedUrlStub
        });
        bucketStub = sinon.stub().returns({ file: fileStub });
        sinon.stub(admin.storage(), 'bucket').returns(bucketStub());
    });
    afterEach(() => {
        sinon.restore();
    });
    describe('getSignedAudioUrl', () => {
        it('should return a signed URL for a valid request', async () => {
            const request = {
                data: { path: 'existingChat/test.webm' },
                auth: { uid: 'testUser' }
            };
            const result = await (0, index_1.getSignedAudioUrl)(request);
            (0, chai_1.expect)(result.url).to.equal('http://fake.url/signed-url');
            (0, chai_1.expect)(result.expiresAt).to.be.a('string');
        });
        it("should throw 'unauthenticated' if user is not authenticated", async () => {
            const request = { data: { path: 'test.webm' } };
            try {
                await (0, index_1.getSignedAudioUrl)(request);
                chai_1.expect.fail('Function should have thrown an error');
            }
            catch (error) {
                (0, chai_1.expect)(error).to.be.instanceOf(https_1.HttpsError);
                if (error instanceof https_1.HttpsError) {
                    (0, chai_1.expect)(error.code).to.equal('unauthenticated');
                }
            }
        });
        it("should throw 'invalid-argument' if path is missing", async () => {
            const request = {
                data: {},
                auth: { uid: 'testUser' }
            };
            try {
                await (0, index_1.getSignedAudioUrl)(request);
                chai_1.expect.fail('Function should have thrown an error');
            }
            catch (error) {
                (0, chai_1.expect)(error).to.be.instanceOf(https_1.HttpsError);
                if (error instanceof https_1.HttpsError) {
                    (0, chai_1.expect)(error.code).to.equal('invalid-argument');
                }
            }
        });
        it("should throw 'permission-denied' if user is not in the chat", async () => {
            const request = {
                data: { path: 'chatWithoutUser/test.webm' },
                auth: { uid: 'testUser' }
            };
            try {
                await (0, index_1.getSignedAudioUrl)(request);
                chai_1.expect.fail('Function should have thrown an error');
            }
            catch (error) {
                (0, chai_1.expect)(error).to.be.instanceOf(https_1.HttpsError);
                if (error instanceof https_1.HttpsError) {
                    (0, chai_1.expect)(error.code).to.equal('permission-denied');
                }
            }
        });
        it("should throw 'not-found' if chat does not exist", async () => {
            const request = {
                data: { path: 'nonexistentChat/test.webm' },
                auth: { uid: 'testUser' }
            };
            try {
                await (0, index_1.getSignedAudioUrl)(request);
                chai_1.expect.fail('Function should have thrown an error');
            }
            catch (error) {
                (0, chai_1.expect)(error).to.be.instanceOf(https_1.HttpsError);
                if (error instanceof https_1.HttpsError) {
                    (0, chai_1.expect)(error.code).to.equal('not-found');
                }
            }
        });
        it("should throw 'not-found' if audio file does not exist", async () => {
            const request = {
                data: { path: 'existingChat/nonexistent.webm' },
                auth: { uid: 'testUser' }
            };
            try {
                await (0, index_1.getSignedAudioUrl)(request);
                chai_1.expect.fail('Function should have thrown an error');
            }
            catch (error) {
                (0, chai_1.expect)(error).to.be.instanceOf(https_1.HttpsError);
                if (error instanceof https_1.HttpsError) {
                    (0, chai_1.expect)(error.code).to.equal('not-found');
                }
            }
        });
    });
    describe('getBatchSignedAudioUrls', () => {
        it('should return a map of signed URLs for valid requests', async () => {
            const request = {
                data: {
                    paths: ['existingChat/test1.webm', 'existingChat/test2.webm'],
                    chatId: 'existingChat'
                },
                auth: { uid: 'testUser' }
            };
            const result = await (0, index_1.getBatchSignedAudioUrls)(request);
            (0, chai_1.expect)(result).to.have.property('existingChat/test1.webm');
            (0, chai_1.expect)(result['existingChat/test1.webm'].url).to.equal('http://fake.url/signed-url');
            (0, chai_1.expect)(result).to.have.property('existingChat/test2.webm');
        });
        it('should handle a mix of existing and non-existing files', async () => {
            const request = {
                data: {
                    paths: ['existingChat/test1.webm', 'existingChat/nonexistent.webm'],
                    chatId: 'existingChat'
                },
                auth: { uid: 'testUser' }
            };
            const result = await (0, index_1.getBatchSignedAudioUrls)(request);
            (0, chai_1.expect)(result).to.have.property('existingChat/test1.webm');
            (0, chai_1.expect)(result).to.not.have.property('existingChat/nonexistent.webm');
        });
        it("should throw 'permission-denied' for users not in chat", async () => {
            const request = {
                data: {
                    paths: ['chatWithoutUser/test1.webm'],
                    chatId: 'chatWithoutUser'
                },
                auth: { uid: 'testUser' }
            };
            try {
                await (0, index_1.getBatchSignedAudioUrls)(request);
                chai_1.expect.fail('Function should have thrown an error');
            }
            catch (error) {
                (0, chai_1.expect)(error).to.be.instanceOf(https_1.HttpsError);
                if (error instanceof https_1.HttpsError) {
                    (0, chai_1.expect)(error.code).to.equal('permission-denied');
                }
            }
        });
    });
});
//# sourceMappingURL=index.test.js.map