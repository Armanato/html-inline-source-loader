const {expect} = require("chai");
const sinon = require("sinon");
const HtmlInlineSourceLoader = require("../src/HtmlInlineSourceLoader");
const {JSDOM} = require("jsdom");
const fs = require("fs");
const MemoryFS = require("memory-fs");
const webpack = require("webpack");

describe("Test HtmlInlineSourceLoader", () => {
    describe("Test HtmlInlineSourceLoader Constructor", () => {
        it("Test Constructor", () => {
            var loaderInstance = {}
            var cb = function(){}
            var fakeHTML = "Fake HTML";
            var fakeDOM = {"fake":"dom"};
            var inlineScriptsStub = sinon.stub(HtmlInlineSourceLoader.prototype, "inlineScripts");

            var inst = new HtmlInlineSourceLoader(loaderInstance, fakeHTML, cb);

            expect(inst).to.be.an.instanceof(HtmlInlineSourceLoader);
            expect(inst.loader).to.equal(loaderInstance);
            expect(inst.dom).to.be.an.instanceof(JSDOM);
            expect(inst.cb).to.equal(cb);
            expect(inlineScriptsStub.calledOnce).to.be.true;
            // Tear Down
            inlineScriptsStub.restore();
        });
    });
    describe("Test HtmlInlineSourceLoader inlineScripts", () => {
        it("Test inlineScripts", () => {
            var scriptStub1 = { "src":"/Script1.js" };
            scriptStub1.getAttribute = sinon.stub().withArgs("src").returns(scriptStub1.src);
            var scriptStub2 = { "src":"/Script2.js" };
            scriptStub2.getAttribute = sinon.stub().withArgs("src").returns(scriptStub2.src);
            var scriptStub3 = { "src":"/Script2.js" };
            scriptStub3.getAttribute = sinon.stub().withArgs("src").returns(scriptStub3.src);

            var scripts = {
                "0":scriptStub1,
                "1":scriptStub2,
                "2":scriptStub3,
                "length":3
            }
            var getElementsByTagNameStub = sinon.stub().returns(scripts);
            var domStub = {
                "window":{ "document":{ "getElementsByTagName":getElementsByTagNameStub } }
                
            }

            var pathToLocalScript = "/path/to/script";
            var emitWarningStub = sinon.stub();
            var loaderStub = {
                "options":{ "context":pathToLocalScript },
                "emitWarning":emitWarningStub
            };

            var existsSyncStub = sinon.stub(fs, "existsSync");
            existsSyncStub.onCall(0).returns(true);
            existsSyncStub.onCall(1).returns(false);
            existsSyncStub.onCall(2).returns(true);

            var promiseStub1 = {"Promise":"One"}
            var promiseStub2 = {"Promise":"Two"}
            var replaceSrcWithSourceStub = sinon.stub()
            replaceSrcWithSourceStub.onCall(0).returns(promiseStub1);
            replaceSrcWithSourceStub.onCall(1).returns(promiseStub2);

            var managePromisesStub = sinon.stub();

            var inst = {
                "loader":loaderStub,
                "dom":domStub,
                "replaceSrcWithSource":replaceSrcWithSourceStub,
                "managePromises":managePromisesStub,
            }

            HtmlInlineSourceLoader.prototype.inlineScripts.call(inst);

            expect(getElementsByTagNameStub.calledOnce).to.be.true;
            expect(getElementsByTagNameStub.calledWith("script")).to.be.true;
            expect(existsSyncStub.calledThrice).to.be.true;
            expect(scriptStub1.getAttribute.calledTwice).to.be.true;
            expect(scriptStub2.getAttribute.calledTwice).to.be.true;
            expect(scriptStub3.getAttribute.calledTwice).to.be.true;
            expect(existsSyncStub.firstCall.calledWith(pathToLocalScript + scriptStub1.src)).to.be.true;
            expect(existsSyncStub.secondCall.calledWith(pathToLocalScript + scriptStub2.src)).to.be.true;
            expect(existsSyncStub.thirdCall.calledWith(pathToLocalScript + scriptStub3.src)).to.be.true;
            expect(replaceSrcWithSourceStub.calledTwice).to.be.true;
            expect(replaceSrcWithSourceStub.firstCall.calledWith(scriptStub1, scriptStub1.src)).to.be.true;
            expect(replaceSrcWithSourceStub.secondCall.calledWith(scriptStub3, scriptStub3.src)).to.be.true;
            expect(emitWarningStub.calledOnce).to.be.true;
            expect(managePromisesStub.calledOnce).to.be.true;
            expect(managePromisesStub.calledWith([promiseStub1, promiseStub2])).to.be.true;
            // Tear Down
            existsSyncStub.restore();
        });
    });
    describe("Test HtmlInlineSourceLoader managePromises", () => {
        var allSpy, thenStub, catchStub, serializeToStringStub, serializedDom,  inst, cbStub, domStub, promises, errorVal;
        beforeEach(() => {
            promises = [];

            thenStub = sinon.stub();
            catchStub = sinon.stub();
            var promiseStub = {
                "then":thenStub,
                "catch":catchStub
            }
            allSpy = sinon.stub(Promise, "all").returns(promiseStub);
            thenStub.returns(promiseStub);
            catchStub.returns(promiseStub);

            cbStub = sinon.stub();
            serializedDom = "Serialized Dom";
            serializeStub = sinon.stub().returns(serializedDom);
            domStub = {"serialize":serializeStub};
            errorVal = "Promise Error";
            inst = {
                "cb":cbStub,
                "dom":domStub
            }
        });
        afterEach(() => {
            allSpy.restore();
        });
        it("Test managePromises Success", () => {
            HtmlInlineSourceLoader.prototype.managePromises.call(inst, promises);

            expect(allSpy.calledOnce).to.be.true;
            expect(allSpy.calledWith(promises)).to.be.true;
            expect(thenStub.calledOnce).to.be.true;
            expect(catchStub.calledOnce).to.be.true;
            // Execute Then Callback
            thenStub.firstCall.args[0]();
            expect(serializeStub.calledOnce).to.be.true;
            expect(cbStub.calledOnce).to.be.true;
            expect(cbStub.calledWith(null, serializedDom)).to.be.true;
            
        });
        it("Test managePromises Error", () => {
            HtmlInlineSourceLoader.prototype.managePromises.call(inst, promises);

            expect(allSpy.calledOnce).to.be.true;
            expect(allSpy.calledWith(promises)).to.be.true;
            expect(thenStub.calledOnce).to.be.true;
            expect(catchStub.calledOnce).to.be.true;
            // Execute Catch Callback
            catchStub.firstCall.args[0](errorVal);
            expect(cbStub.calledOnce).to.be.true;
            expect(cbStub.calledWith(errorVal)).to.be.true;
            expect(serializeStub.notCalled).to.be.true;
        });
    });
    describe("Test HtmlInlineSourceLoader replaceSrcWithSource", () => {
        it("Test replaceSrcWithSource Promise", () => {
            var getSourceForFileStub = sinon.stub();
            var filePath = "/Path/To/File";
            var inst = { "getSourceForFile":getSourceForFileStub }
            var scriptFake = {};
            var res = HtmlInlineSourceLoader.prototype.replaceSrcWithSource.call(inst, scriptFake, filePath);

            expect(res).to.be.an.instanceof(Promise);
            expect(getSourceForFileStub.calledOnce).to.be.true;
            expect(getSourceForFileStub.firstCall.args[0]).to.equal(filePath)
            expect(getSourceForFileStub.firstCall.args[1]).to.be.a("function");
            expect(getSourceForFileStub.firstCall.args[2]).to.be.a("function");
        });
        it("Test replaceSrcWithSource Then", () => {
            var thenStub = sinon.stub(Promise.prototype, "then");
            var getSourceForFileStub = sinon.stub();
            var fakeSource = "Some Javascript Source";
            var filePath = "/Path/To/File"
            var scriptStub = {
                "removeAttribute":sinon.stub(),
                "textContent":""
            }
            var inst = { "getSourceForFile":getSourceForFileStub }

            HtmlInlineSourceLoader.prototype.replaceSrcWithSource.call(inst, scriptStub, filePath);
            expect(thenStub.calledOnce).to.be.true;
            // Execute Promise.then Callback
            thenStub.args[0][0](fakeSource);

            expect(scriptStub.removeAttribute.calledOnce).to.be.true;
            expect(scriptStub.removeAttribute.calledWith("src")).to.be.true;
            expect(scriptStub.textContent).to.equal(fakeSource)
            // Tear Down
            thenStub.restore();
        });
    });
    describe("Test HtmlInlineSourceLoader getSourceForFile", () => {
        it("Test getSourceForFile", () => {
            var runStub = sinon.stub();
            var compilerStub = {
                "run":runStub,
                "outputFileSystem":null,
            };
            var webpackStub = sinon.stub().returns(compilerStub);
            var fileVal = "./Path/To/File";
            var contextVal = "/Current/Context";
            var modules = [];
            var plugins = [];
            var loaderStub = {
                "options":{
                    "module":modules,
                    "plugins":plugins,
                    "context":contextVal
                }
            }
            var webpackExpectedArg = {
                "entry":fileVal,
                "context":contextVal,
                "output":{ "filename":fileVal },
                "module":modules,
                "plugins":plugins
            }
            var inst = {
                "webpack":webpackStub,
                "loader":loaderStub
            }
            var resolveStub = sinon.stub();
            var rejectStub = sinon.stub();

            HtmlInlineSourceLoader.prototype.getSourceForFile.call(inst, fileVal);

            expect(resolveStub.notCalled).to.be.true;
            expect(rejectStub.notCalled).to.be.true;
            expect(webpackStub.calledOnce).to.be.true;
            expect(webpackStub.calledWith(webpackExpectedArg)).to.be.true;
            expect(compilerStub.outputFileSystem).to.be.an.instanceof(MemoryFS);
        });
        it("Test getSourceForFile Absolute Path", () => {
            var runStub = sinon.stub();
            var compilerStub = {
                "run":runStub,
                "outputFileSystem":null,
            };
            var webpackStub = sinon.stub().returns(compilerStub);
            var fileVal = "/Path/To/File";
            var contextVal = "/Current/Context";
            var modules = [];
            var plugins = [];
            var loaderStub = {
                "options":{
                    "module":modules,
                    "plugins":plugins,
                    "context":contextVal
                }
            }
            var webpackExpectedArg = {
                "entry":"."+fileVal,
                "context":contextVal,
                "output":{ "filename":"."+fileVal },
                "module":modules,
                "plugins":plugins
            }
            var inst = {
                "webpack":webpackStub,
                "loader":loaderStub
            }
            var resolveStub = sinon.stub();
            var rejectStub = sinon.stub();

            HtmlInlineSourceLoader.prototype.getSourceForFile.call(inst, fileVal);

            expect(resolveStub.notCalled).to.be.true;
            expect(rejectStub.notCalled).to.be.true;
            expect(webpackStub.calledOnce).to.be.true;
            expect(webpackStub.calledWith(webpackExpectedArg)).to.be.true;
            expect(compilerStub.outputFileSystem).to.be.an.instanceof(MemoryFS);
        });
        describe("Test getSourceForFile Webpack Run", () => {
            var resolveStub, rejectStub, fileVal, contextVal, runStub, registerDependenciesStub, readFileSyncStub, readFileSyncReturnStub, toStringStub, stringOutput, registerDependenciesStub, webpackStub, inst;
            beforeEach(() => {
                resolveStub = sinon.stub();
                rejectStub = sinon.stub();
                fileVal = "/Path/To/File";
                contextVal = "/Context/Path"
                runStub = sinon.stub();
                registerDependenciesStub = sinon.stub();
                stringOutput = "To String Output";
                toStringStub = sinon.stub().returns(stringOutput);
                readFileSyncReturnStub = {
                    "toString":toStringStub
                }
                readFileSyncStub = sinon.stub(MemoryFS.prototype, "readFileSync").returns(readFileSyncReturnStub);
                registerDependenciesStub = sinon.stub();
                webpackStub = sinon.stub().returns({ "run":runStub });
                inst = {
                    "registerDependencies":registerDependenciesStub,
                    "webpack":webpackStub,
                    "loader":{"options":{
                        "context":contextVal
                    }}
                }
            });
            afterEach(() => {
                readFileSyncStub.restore();
            });
            it("Test Run Success", () => {
                var compilationStub = { "fileDependencies":[] }
                var statsStub = {
                    "compilation":compilationStub
                }

                HtmlInlineSourceLoader.prototype.getSourceForFile.call(inst, fileVal, resolveStub, rejectStub);

                expect(runStub.calledOnce).to.be.true;
                // Execute Run Callback
                runStub.args[0][0](null, statsStub);

                expect(registerDependenciesStub.calledOnce).to.be.true;
                expect(registerDependenciesStub.calledWith(compilationStub)).to.be.true;
                expect(readFileSyncStub.calledOnce).to.be.true;
                expect(readFileSyncStub.calledWith(contextVal+fileVal)).to.be.true;
                expect(toStringStub.calledOnce).to.be.true;
                expect(resolveStub.calledOnce).to.be.true;
                expect(resolveStub.calledWith(stringOutput)).to.be.true;
            });
            it("Test Run Error", () => {
                var errorVal = "Got an Error Running Webpack";

                HtmlInlineSourceLoader.prototype.getSourceForFile.call(inst, fileVal, resolveStub, rejectStub);
                expect(runStub.calledOnce).to.be.true;
                // Execute Run Callback
                runStub.args[0][0](errorVal);

                expect(registerDependenciesStub.notCalled).to.be.true;
                expect(readFileSyncStub.notCalled).to.be.true;
                expect(toStringStub.notCalled).to.be.true;
                expect(rejectStub.calledOnce).to.be.true;
                expect(rejectStub.calledWith(errorVal)).to.be.true;
            });
        });
    });
    describe("Test HtmlInlineSourceLoader registerDependencies", () => {
        it("Test registerDependencies", () => {
            var addDependencyStub = sinon.stub();
            var dependency1 = "/Path/To/File/1";
            var dependency2 = "/Path/To/File/2";
            var compilationStub = {
                "fileDependencies":[dependency1, dependency2]
            }
            var inst = {
                "loader":{
                    "addDependency":addDependencyStub
                }
            }

            HtmlInlineSourceLoader.prototype.registerDependencies.call(inst, compilationStub);

            expect(addDependencyStub.calledTwice).to.be.true;
            expect(addDependencyStub.firstCall.calledWith(dependency1)).to.be.true;
            expect(addDependencyStub.secondCall.calledWith(dependency2)).to.be.true;
        });
        it("Test registerDependencies No Dependencies", () => {
            var addDependencyStub = sinon.stub();
            var compilationStub = { "fileDependencies":[] }
            var inst = {
                "loader":{ "addDependency":addDependencyStub }
            }

            HtmlInlineSourceLoader.prototype.registerDependencies.call(inst, compilationStub);

            expect(addDependencyStub.notCalled).to.be.true;
        });
        it("Test registerDependencies No File Dependencies", () => {
            var addDependencyStub = sinon.stub();
            var compilationStub = {}
            var inst = {
                "loader":{ "addDependency":addDependencyStub }
            }

            HtmlInlineSourceLoader.prototype.registerDependencies.call(inst, compilationStub);

            expect(addDependencyStub.notCalled).to.be.true;
        });
        it("Test registerDependencies No Compilation", () => {
            var addDependencyStub = sinon.stub();
            var compilationStub = {}
            var inst = {
                "loader":{ "addDependency":addDependencyStub }
            }

            HtmlInlineSourceLoader.prototype.registerDependencies.call(inst, compilationStub);

            expect(addDependencyStub.notCalled).to.be.true;
        });
    });
});