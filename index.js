const HtmlInlineSourceLoader = require("./src/HtmlInlineSourceLoader");

module.exports = function(content){
    new HtmlInlineSourceLoader(this, content, this.async());
}