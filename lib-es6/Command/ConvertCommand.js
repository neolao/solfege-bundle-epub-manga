/**
 * Command to convert a manga directory
 */
export default class ConvertCommand
{
    /**
     * Constructor
     *
     * @param   {Builder}   builder     Builder instance
     */
    constructor(builder)
    {
        this.builder = builder;
    }

    /**
     * Get command name
     *
     * @return  {string}    Command name
     */
    getName()
    {
        return "epub-manga:convert";
    }

    /**
     * Get command description
     *
     * @return  {string}    Command description
     */
    getDescription()
    {
        return "Convert manga directory";
    }

    /**
     * Execute the command
     *
     * @param   {Array}     parameters  Command parameters
     */
    *execute(parameters)
    {
        let targetPath = parameters[0];
        let newFilePath = parameters[1];
        let title = parameters[2];

        yield this.builder.build(targetPath, newFilePath, title);
    }
}
