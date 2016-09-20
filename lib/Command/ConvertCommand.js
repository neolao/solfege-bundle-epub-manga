"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Command to convert a manga directory
 */
class ConvertCommand {
  /**
   * Constructor
   *
   * @param   {Builder}   builder     Builder instance
   */
  constructor(builder) {
    this.builder = builder;
  }

  /**
   * Get command name
   *
   * @return  {string}    Command name
   */
  getName() {
    return "epub-manga:convert";
  }

  /**
   * Get command description
   *
   * @return  {string}    Command description
   */
  getDescription() {
    return "Convert manga directory";
  }

  /**
   * Execute the command
   *
   * @param   {Array}     parameters  Command parameters
   */
  *execute(parameters) {
    var targetPath = parameters[0];
    var newFilePath = parameters[1];
    var title = parameters[2];

    yield this.builder.build(targetPath, newFilePath, title);
  }
}
exports.default = ConvertCommand;
module.exports = exports['default'];