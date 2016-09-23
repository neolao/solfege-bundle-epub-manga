import os from "os";
import fs from "fs";
import { basename } from "path";
import { copy, remove, readdir, writeFile, readFile, move, outputFile } from "co-fs-extra";
import printf from "printf";
import uuidGenerator from "uuid";
import mime from "mime";
import Zip from "jszip";
import getImageDimension from "image-size";
import sharp from "sharp";
import TextToSVG from "text-to-svg";
import svg2png from "svg2png";

/**
 * EPUB builder
 */
export default class EpubBuilder
{
    // Default options
    defaultOptions = {
        width: 1072,
        height: 1448,
        direction: "rtl",
        author: "EPUB Manga Generator",
        regionMagnification: true
    }

    /**
     * Constructor
     */
    constructor()
    {
    }

    /**
     * Build a manga in EPUB format
     *
     * @param   {string}    directoryPath       Directory containing images
     * @param   {string}    generatedFilePath   File to generate
     * @param   {string}    title               Title
     * @param   {object}    options             Options
     */
    *build(directoryPath:string, generatedFilePath:string, title:string, options:Object = {})
    {
        // Default options
        options = Object.assign({}, this.defaultOptions, options);

        // Metadata
        const uuid = uuidGenerator.v4();

        // Build temporary directory
        const tempDirectory = fs.mkdtempSync(`${os.tmpdir()}/epub-manga-`);

        // Copy images
        const imagesPath = `${tempDirectory}/images`;
        yield copy(directoryPath, imagesPath);
        const imageFileNames = yield readdir(imagesPath);
        let imageFilePaths = [];
        for (let imageFileName of imageFileNames) {
            imageFilePaths.push(`${imagesPath}/${imageFileName}`);
        }

        // Resize images
        yield this.resizeImages(imageFilePaths, options.width, options.height);

        // Build cover
        const coverFilePath = `${tempDirectory}/cover.jpg`;
        yield this.buildCover(imageFilePaths[0], coverFilePath, title);

        // Copy stylesheet
        const styleFilePath = `${tempDirectory}/style.css`;
        yield copy(`${__dirname}/epub/style.css`, styleFilePath);

        // Build HTML files
        let htmlFilePaths = yield this.buildMangaHtmlFiles(imagesPath, tempDirectory, title, options);

        // Build NAV file
        const navFilePath = `${tempDirectory}/nav.xhtml`;
        yield this.buildNavFile(htmlFilePaths, navFilePath, title);

        // Build NCX file
        const ncxFilePath = `${tempDirectory}/toc.ncx`;
        yield this.buildNcxFile(htmlFilePaths, ncxFilePath, uuid, title);

        // Build OPF file
        const opfFilePath = `${tempDirectory}/content.opf`;
        yield this.buildOpfFile(imageFilePaths, htmlFilePaths, opfFilePath, uuid, title);

        // Build META-INF
        const metaFilePath = `${tempDirectory}/META-INF/container.xml`;
        yield this.buildMetaFile(metaFilePath);

        // Zip files
        let archive = new Zip();
        for (let imageFileName of imageFileNames) {
            let imageContent = yield readFile(`${imagesPath}/${imageFileName}`);
            archive.file(`images/${imageFileName}`, imageContent, {binary: true});
        }
        for (let htmlFilePath of htmlFilePaths) {
            let fileName = basename(htmlFilePath);
            let fileContent = yield readFile(htmlFilePath);
            archive.file(fileName, fileContent);
        }
        archive.file("cover.jpg", yield readFile(coverFilePath));
        archive.file("style.css", yield readFile(styleFilePath));
        archive.file("nav.xhtml", yield readFile(navFilePath));
        archive.file("toc.ncx", yield readFile(ncxFilePath));
        archive.file("content.opf", yield readFile(opfFilePath));
        archive.file("META_INF/container.xml", yield readFile(metaFilePath));
        let archiveContent = yield archive.generateAsync({type: "binarystring"});
        yield writeFile(generatedFilePath, archiveContent, "binary");

        // Delete temporary directory
        yield remove(tempDirectory);
    }

    /**
     * Build manga HTML files
     *
     * @param   {string}    directoryPath       Directory containing images
     * @param   {string}    destinationPath     Destination directory path
     * @param   {string}    title               Manga title
     * @param   {object}    options             Options
     * @return  {Array}                         File paths
     */
    *buildMangaHtmlFiles(directoryPath:string, destinationPath:string, title:string, options:Object = {})
    {
        // Default options
        options = Object.assign({}, this.defaultOptions, options);


        let filePaths = [];
        let width = options.width;
        let height = options.width;
        let index = 1;

        const imageFileNames = yield readdir(directoryPath);
        for (let imageFileName of imageFileNames) {
            let imagePath = `${directoryPath}/${imageFileName}`;

            let content = `<?xml version="1.0" encoding="UTF-8"?>\n`;
            content += `<!DOCTYPE html>\n`;
            content += `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\n`;
            content += `<head>`;
            content += `<title>${index}</title>`;
            content += `<link href="style.css" type="text/css" rel="stylesheet"/>`;
            content += `<meta name="viewport" content="width=${width}, height=${height}"/>`;
            content += `</head>`;
            content += `<body style="background-image: url(images/${imageFileName})">`;

            // Build panel view for region magnification
            if (options.regionMagnification) {
                content += yield this.getImagePanelView(imagePath, width, height);
            }

            content += `</body>`;
            content += `</html>`;

            let generatedFilePath = `${destinationPath}/${printf("%05d", index)}.xhtml`;
            yield writeFile(generatedFilePath, content);
            filePaths.push(generatedFilePath);

            index++;
        }

        return filePaths;
    }

    /**
     * Get panel view for an image
     *
     * @param   {string}    imagePath   Image path
     * @param   {uint32}    pageWidth   Page width
     * @param   {uint32}    pageHeight  Page height
     * @return  {string}                HTML content for the panel view
     */
    *getImagePanelView(imagePath:string, pageWidth:uint32, pageHeight:uint32)
    {
        let imageFileName = basename(imagePath);
        let imageDimension = getImageDimension(imagePath);
        let imageWidth = imageDimension.width;
        let imageHeight = imageDimension.height;
        let panelViewWidth = Math.floor(pageWidth / 2 - imageWidth / 2) / pageWidth * 100;
        let panelViewHeight = Math.floor(pageHeight / 2 - imageHeight / 2) / pageHeight * 100;

        let content = `<div id="PV">`;

        content += `<div id="PV-L">
            <a style="display: inline-block; width: 100%; height: 100%" 
                class="app-amzn-magnify"
                data-app-amzn-magnify='{"targetId":"PV-L-P", "ordinal": 1}'
            ></a>
        </div>`;
        
        content += `</div>`;
            
        content += `<div class="PV-P" id="PV-L-P" style="background: #ffffff">
            <img style="position: absolute; left: 0; top: ${panelViewHeight}%" src="images/${imageFileName}" width="${imageWidth}" height="${imageHeight}"/>
        </div>`;
        
        return content;
    }

    /**
     * Build nav file
     *
     * @param   {Array}     filePaths           Page file paths
     * @param   {string}    generatedFilePath   Generated file path
     * @param   {string}    title               Manga title
     */
    *buildNavFile(filePaths, generatedFilePath:string, title:string)
    {
        let items = "";
        let index = 1;
        for (let filePath of filePaths) {
            let fileName = basename(filePath);
            let fileTitle = index + 1;
            items += `<li><a href="${fileName}">${fileTitle}</a></li>\n`;
            index++;
        }

        let content = `<?xml version="1.0" encoding="utf-8"?>\n`;
        content += `<!DOCTYPE html>\n`;
        content += `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\n`;
        content += `<head>\n`;
        content += `<title>${title}</title>\n`;
        content += `<meta charset="utf-8"/>\n`;
        content += `</head>\n`;
        content += `<body>\n`;
        content += `<nav xmlns:epub="http://www.idpf.org/2007/ops" epub:type="toc" id="toc">\n`;
        content += `<ol>\n`;
        content += items;
        content += `</ol>\n`;
        content += `</nav>\n`;
        content += `<nav epub:type="page-list">\n`;
        content += `<ol>\n`;
        content += items;
        content += `</ol>\n`;
        content += `</nav>\n`;
        content += `</body>\n`;
        content += `</html>\n`;

        yield writeFile(generatedFilePath, content);
    }

    /**
     * Build NCX file
     *
     * @param   {Array}     filePaths           Page file paths
     * @param   {string}    generatedFilePath   Generated file path
     * @param   {string}    uuid                Manga UUID
     * @param   {string}    title               Manga title
     */
    *buildNcxFile(filePaths, generatedFilePath:string, uuid:string, title:string)
    {
        const pageCount = filePaths.length;
        const maxPageNumber = pageCount + 1;

        let content = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        content += `<ncx version="2005-1" xml:lang="en-US" xmlns="http://www.daisy.org/z3986/2005/ncx/">\n`;
        content += `<head>\n`;
        content += `<meta name="dtb:uid" content="urn:uuid:${uuid}"/>\n`;
        content += `<meta name="dtb:depth" content="1"/>\n`;
        content += `<meta name="dtb:totalPageCount" content="0"/>\n`;
        content += `<meta name="dtb:maxPageNumber" content="0"/>\n`;
        content += `<meta name="generated" content="true"/>\n`;
        content += `</head>\n`;
        content += `<docTitle><text>${title}</text></docTitle>\n`;
        content += `<navMap>\n`;

        for (let index in filePaths) {
            let filePath = filePaths[index];
            let fileName = basename(filePath);
            let fileId = printf("%05d", index);
            let fileTitle = index + 1;
            content += `<navPoint id="${fileId}"><navLabel><text>${fileTitle}</text></navLabel><content src="${fileName}"/></navPoint>\n`;
        }

        content += `</navMap>\n`;
        content += `</ncx>`;

        yield writeFile(generatedFilePath, content);
    }

    /**
     * Build OPF file
     *
     * @param   {Array}     imageFilePaths      Image file paths
     * @param   {Array}     htmlFilePaths       Page file paths
     * @param   {string}    generatedFilePath   Generated file path
     * @param   {string}    uuid                Manga UUID
     * @param   {string}    title               Manga title
     */
    *buildOpfFile(imageFilePaths, htmlFilePaths, generatedFilePath:string, uuid:string, title:string, options:Object = {})
    {
        // Default options
        options = Object.assign({}, this.defaultOptions, options);


        let width = options.width;
        let height = options.height;
        let writingMode = "horizontal-rl";
        let spineDirection = "rtl";
        if (options.direction === "ltr") {
            writingMode = "horizontal-lr";
            spineDirection = "ltr";
        }
        let orientation = "portrait";
        let regionMagnification = "false";
        if (options.regionMagnification) {
            regionMagnification = "true";
        }
        let author = options.author;

        let content = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        content += `<package version="3.0" unique-identifier="BookID" xmlns="http://www.idpf.org/2007/opf">\n`;
        content += `<metadata xmlns:opf="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/">\n`;
        content += `<dc:title>${title}</dc:title>\n`;
        content += `<dc:language>en-US</dc:language>\n`;
        content += `<dc:identifier id="BookID">urn:uuid:${uuid}</dc:identifier>\n`;
        content += `<dc:contributor id="contributor">${author}</dc:contributor>\n`;
        content += `<dc:creator>${author}</dc:creator>\n`;
        content += `<meta name="cover" content="cover"/>\n`;
        content += `<meta property="rendition:orientation">${orientation}</meta>\n`;
        content += `<meta property="rendition:spread">${orientation}</meta>\n`;
        content += `<meta property="rendition:layout">pre-paginated</meta>\n`;
        content += `<meta name="original-resolution" content="${width}x${height}"/>\n`;
        content += `<meta name="book-type" content="comic"/>\n`;
        content += `<meta name="RegionMagnification" content="${regionMagnification}"/>\n`;
        content += `<meta name="primary-writing-mode" content="${writingMode}"/>\n`;
        content += `<meta name="zero-gutter" content="true"/>\n`;
        content += `<meta name="zero-margin" content="true"/>\n`;
        content += `<meta name="ke-border-color" content="#ffffff"/>\n`;
        content += `<meta name="ke-border-width" content="0"/>\n`;
        content += `</metadata>`;
        content += `<manifest>`;

        content += `<item id="cover" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>\n`;
        content += `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>\n`;
        content += `<item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/>\n`;

        for (let index in imageFilePaths) {
            let filePath = imageFilePaths[index];
            let fileName = basename(filePath);
            let fileMime = mime.lookup(filePath);
            content += `<item id="image_${index}" href="images/${fileName}" media-type="${fileMime}"/>`;
        }

        for (let index in htmlFilePaths) {
            let filePath = htmlFilePaths[index];
            let fileName = basename(filePath);
            content += `<item id="page_${index}" href="${fileName}" media-type="application/xhtml+xml"/>`;
        }

        content += `</manifest>`;
        content += `<spine page-progression-direction="${spineDirection}" toc="ncx">`;

        for (let index in htmlFilePaths) {
            content += `<itemref idref="page_${index}"/>`;
        }

        content += `</spine>`;
        content += `</package>`;

        yield writeFile(generatedFilePath, content);
    }

    /**
     * Build meta file
     *
     * @param   {string}    filePath    Generated file path
     */
    *buildMetaFile(filePath:string)
    {
        let content = `<?xml version="1.0"?>\n`;
        content += `<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n`;
        content += `<rootfiles>\n`;
        content += `<rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>\n`;
        content += `</rootfiles>\n`;
        content += `</container>\n`;

        yield outputFile(filePath, content);
    }

    /**
     * Resize images
     *
     * @param   {Array}     filePaths   Image file paths
     * @param   {uint32}    width       Image width
     * @param   {uint32}    height      Image height
     */
    *resizeImages(filePaths, width:uint32, height:uint32)
    {
        for (let filePath of filePaths) {
            let tempImagePath = `${filePath}.tmp`;
            let image = sharp(filePath);

            // Resize the image
            // White background
            yield image.resize(width, height)
                       .embed()
                       .background({r: 255, g: 255, b: 255, a: 1})
                       .toFile(tempImagePath);

            // Override file
            yield move(tempImagePath, filePath, {clobber: true});
        }
    }

    /**
     * Build cover
     *
     * @param   {string}    imageFilePath       Source file path
     * @param   {string}    generatedFilePath   Cover file path
     * @param   {string}    title               Cover title
     */
    *buildCover(imageFilePath:string, generatedFilePath:string, title:?string = null)
    {
        let dimension = getImageDimension(imageFilePath);
        let imageMime = mime.lookup(imageFilePath);

        // Get base64
        let imageContent = yield readFile(imageFilePath);
        let buffer = Buffer.from(imageContent);
        let base64 = buffer.toString("base64");

        // Build title SVG
        let titleSvg = "";
        if (typeof title === "string" && title.length > 0) {
            titleSvg = this.getCoverTitleSvg(title, dimension.width, dimension.height);
        }

        // Build SVG content
        let svgContent = `<svg id="example1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${dimension.width}" height="${dimension.height}">
            <image x="0" y="0" width="${dimension.width}" height="${dimension.height}" xlink:href="data:${imageMime};base64,${base64}"/>
            ${titleSvg}
        </svg>`;

        // Generate image
        let svgBuffer = Buffer.from(svgContent);
        let pngBuffer = yield svg2png(svgBuffer);
        let svg = sharp(pngBuffer);
        yield svg.toFile(generatedFilePath);
    }

    /**
     * Get cover title in SVG format
     * It should be contained in a specific box dimension
     *
     * @param   {string}    title               Manga title
     * @param   {uint32}    containerWidth      Width of the container
     * @param   {uint32}    containerHeight     Height of the container
     * @return  {string}                        SVG
     */
    getCoverTitleSvg(title:string, containerWidth:uint32, containerHeight:uint32)
    {
        const textToSVG = TextToSVG.loadSync();
        const textOptions = {
            x: Math.round(containerWidth / 2),
            y: Math.round(containerHeight / 2),
            fontSize: 100,
            anchor: "center middle",
            attributes: {
                fill: "#ffffff"
            }
        };

        // Build the text path in one line
        let margin = 100;
        let textPath = textToSVG.getPath(title, textOptions);
        let textMetrics = textToSVG.getMetrics(title, textOptions);
        if (textMetrics.width < containerWidth - margin) {
            return `<rect x="0" y="${textMetrics.y - 10}" width="${containerWidth}" height="${textMetrics.height + 20}" fill="#000000"/>
                ${textPath}
            `;
        }

        // The text is too long
        // We have to split it in several lines
        let lineHeight = textMetrics.height;
        let lineCount = Math.ceil(textMetrics.width / (containerWidth - margin));
        let linesHeight = lineHeight * lineCount;
        let words = title.split(" ");
        let wordCount = words.length;
        let wordPerLine = Math.ceil(wordCount / lineCount);
        let lines = [];
        for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
            let start = lineIndex * wordPerLine;
            let end = start + wordPerLine;
            let line = words.slice(start, end);
            lines.push(line.join(" "));
        }

        let svg = "";
        for(let lineIndex in lines) {
            let line = lines[lineIndex];
            let lineOptions = Object.assign({}, textOptions, {
                y: Math.round(containerHeight / 2 - linesHeight / 2 + lineHeight) + lineIndex * lineHeight
            });
            let linePath = textToSVG.getPath(line, lineOptions);
            let lineMetrics = textToSVG.getMetrics(line, lineOptions);
            svg += `<rect x="0" y="${lineMetrics.y - 10}" width="${containerWidth}" height="${lineMetrics.height + 20}" fill="#000000"/>`;
            svg += linePath;
        }

        return svg;
    }
}
