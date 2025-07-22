"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const chai_1 = require("chai");
require("mocha");
const sinon = require("sinon");
const functions = require("firebase-functions-test");
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
        const get = sinon.stub();
        get.withArgs('existingChat').resolves({
            exists: true,
            data: () => ({ participants: ['testUser'] })
        });
        get.withArgs('nonexistentChat').resolves({ exists: false });
        get.withArgs('chatWithoutUser').resolves({
            exists: true,
            data: () => ({ participants: ['anotherUser'] })
        });
        sinon.stub(admin.firestore(), 'collection').returns({
            doc: get
        });
        // Stub Storage
        const exists = sinon.stub();
        exists.withArgs().resolves([true]);
        exists.withArgs('nonexistent.webm').resolves([false]);
        const getSignedUrl = sinon.stub().resolves(['http://fake.url/signed-url']);
        fileStub = sinon.stub().returns({ exists, getSignedUrl });
        bucketStub = sinon.stub().returns({ file: fileStub });
        sinon.stub(admin.storage(), 'bucket').returns(bucketStub());
    });
    afterEach(() => {
        sinon.restore();
    });
    describe('getSignedAudioUrl', () => {
        it('should return a signed URL for a valid request', async () => {
            const wrapped = testEnv.wrap(index_1.getSignedAudioUrl);
            const result = await wrapped({
                path: 'existingChat/test.webm'
            }, {
                auth: {
                    uid: 'testUser',
                    token: {
                        uid: 'testUser'
                    }
                }
            });
            (0, chai_1.expect)(result.url).to.equal('http://fake.url/signed-url');
            (0, chai_1.expect)(result.expiresAt).to.be.a('string');
        });
        it("should throw 'unauthenticated' if user is not authenticated", async () => {
            const wrapped = testEnv.wrap(index_1.getSignedAudioUrl);
            try {
                await wrapped({ path: 'test.webm' });
                chai_1.expect.fail('Function should have thrown an error');
            }
            catch (error) {
                (0, chai_1.expect)(error.code).to.equal('unauthenticated');
            }
        });
        it("should throw 'invalid-argument' if path is missing", async () => {
            const wrapped = testEnv.wrap(index_1.getSignedAudioUrl);
            try {
                await wrapped({}, {
                    auth: {
                        uid: 'testUser',
                        token: {
                            uid: 'testUser'
                        }
                    }
                });
                chai_1.expect.fail('Function should have thrown an error');
            }
            catch (error) {
                (0, chai_1.expect)(error.code).to.equal('invalid-argument');
            }
        });
        it("should throw 'permission-denied' if user is not in the chat", async () => {
            const wrapped = testEnv.wrap(index_1.getSignedAudioUrl);
            try {
                await wrapped({ path: 'chatWithoutUser/test.webm' }, {
                    auth: {
                        uid: 'testUser',
                        token: {
                            uid: 'testUser'
                        }
                    }
                });
                chai_1.expect.fail('Function should have thrown an error');
            }
            catch (error) {
                (0, chai_1.expect)(error.code).to.equal('permission-denied');
            }
        });
        it("should throw 'not-found' if chat does not exist", async () => {
            const wrapped = testEnv.wrap(index_1.getSignedAudioUrl);
            try {
                await wrapped({ path: 'nonexistentChat/test.webm' }, {
                    auth: {
                        uid: 'testUser',
                        token: {
                            uid: 'testUser'
                        }
                    }
                });
                chai_1.expect.fail('Function should have thrown an error');
            }
            catch (error) {
                (0, chai_1.expect)(error.code).to.equal('not-found');
            }
        });
        it("should throw 'not-found' if audio file does not exist", async () => {
            const wrapped = testEnv.wrap(index_1.getSignedAudioUrl);
            try {
                await wrapped({ path: 'existingChat/nonexistent.webm' }, {
                    auth: {
                        uid: 'testUser',
                        token: {
                            uid: 'testUser'
                        }
                    }
                });
                chai_1.expect.fail('Function should have thrown an error');
            }
            catch (error) {
                (0, chai_1.expect)(error.code).to.equal('not-found');
            }
        });
    });
    describe('getBatchSignedAudioUrls', () => {
        it('should return a map of signed URLs for valid requests', async () => {
            const wrapped = testEnv.wrap(index_1.getBatchSignedAudioUrls);
            const result = await wrapped({
                paths: ['existingChat/test1.webm', 'existingChat/test2.webm'],
                chatId: 'existingChat'
            }, {
                auth: {
                    uid: 'testUser',
                    token: {
                        uid: 'testUser'
                    }
                }
            });
            (0, chai_1.expect)(result).to.have.property('existingChat/test1.webm');
            (0, chai_1.expect)(result['existingChat/test1.webm'].url).to.equal('http://fake.url/signed-url');
            (0, chai_1.expect)(result).to.have.property('existingChat/test2.webm');
        });
        it('should handle a mix of existing and non-existing files', async () => {
            const wrapped = testEnv.wrap(index_1.getBatchSignedAudioUrls);
            const result = await wrapped({
                paths: ['existingChat/test1.webm', 'existingChat/nonexistent.webm'],
                chatId: 'existingChat'
            }, {
                auth: {
                    uid: 'testUser',
                    token: {
                        uid: 'testUser'
                    }
                }
            });
            (0, chai_1.expect)(result).to.have.property('existingChat/test1.webm');
            (0, chai_1.expect)(result).to.not.have.property('existingChat/nonexistent.webm');
        });
        it("should throw 'permission-denied' for users not in chat", async () => {
            const wrapped = testEnv.wrap(index_1.getBatchSignedAudioUrls);
            try {
                await wrapped({
                    paths: ['chatWithoutUser/test1.webm'],
                    chatId: 'chatWithoutUser'
                }, {
                    auth: {
                        uid: 'testUser',
                        token: {
                            uid: 'testUser'
                        }
                    }
                });
                chai_1.expect.fail('Function should have thrown an error');
            }
            catch (error) {
                (0, chai_1.expect)(error.code).to.equal('permission-denied');
            }
        });
    });
});
//# sourceMappingURL=test.js.map