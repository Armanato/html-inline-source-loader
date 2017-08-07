const webpack = require("webpack");
const fs = require("fs");
const MemoryFS = require("memory-fs");
const {JSDOM} = require("jsdom");

class HtmlInlineSourceLoader {
    constructor(loader, html, cb) {
        this.loader = loader;
        this.cb = cb;
        this.dom = new JSDOM(html);
        this.inlineScripts();
    }
    inlineScripts() {
        var promises = [];

        var scripts = this.dom.window.document.getElementsByTagName("script");
        for (var x = 0; x < scripts.length; x++) {
            var srcPath = scripts[x].getAttribute("src")
            if (scripts[x].getAttribute("src") && fs.existsSync(this.loader.options.context+srcPath)) {
                promises.push(this.replaceSrcWithSource(scripts[x], srcPath));
            } else {
                this.loader.emitWarning("Source file ("+srcPath+") does not exist.");
            }
        }

        this.managePromises(promises);
    }
    managePromises(promises) {
        Promise.all(promises)
        .then(() => this.cb(null, this.dom.serialize()) )
        .catch((err) => this.cb(err));
    }
    replaceSrcWithSource(script, file) {
        return new Promise( (resolve, reject) => this.getSourceForFile(file, resolve, reject))
        .then( (source) => {
            script.removeAttribute("src");
            script.textContent = source;
        });
    }
    getSourceForFile(file, resolve, reject) {
        var relativeFile = file.substring(0, 1) != "." ? "." + file : file; //Entry Path must be a relative path.
        var compiler = this.webpack({
            entry:relativeFile,
            context:this.loader.options.context,
            output:{ "filename":relativeFile },
            module:this.loader.options.module,
            plugins:this.loader.options.plugins
        });
        compiler.outputFileSystem = new MemoryFS();
        
        compiler.run((err, stats) => {
            if (err) { reject(err); return; }

            this.registerDependencies(stats.compilation);
            resolve(compiler.outputFileSystem.readFileSync(this.loader.options.context+file).toString());
        });
    }
    registerDependencies(compilation) {
        if (compilation && compilation.fileDependencies) {
            compilation.fileDependencies.forEach((dependency) => this.loader.addDependency(dependency));
        }
    }

    get webpack() {
        return webpack;
    }
}

module.exports = HtmlInlineSourceLoader;