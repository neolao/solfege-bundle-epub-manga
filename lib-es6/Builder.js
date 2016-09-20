import os from "os";
import fs from "fs";
import { basename } from "path";
import { copy, remove, readdir, writeFile, readFile, move, outputFile } from "co-fs-extra";
import printf from "printf";
import uuidGenerator from "uuid";
import mime from "mime";
import Zip from "jszip";

/**
 * EPUB builder
 */
export default class EpubBuilder
{
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
     */
    *build(directoryPath:string, generatedFilePath:string, title:string)
    {
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

        // Copy stylesheet
        const styleFilePath = `${tempDirectory}/style.css`;
        yield copy(`${__dirname}/epub/style.css`, styleFilePath);

        // Build HTML files
        let htmlFilePaths = yield this.buildMangaHtmlFiles(imagesPath, tempDirectory);

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
        archive.file("style.css", yield readFile(styleFilePath));
        archive.file("nav.xhtml", yield readFile(navFilePath));
        archive.file("toc.ncx", yield readFile(ncxFilePath));
        archive.file("content.opf", yield readFile(opfFilePath));
        archive.file("META_INF/container.xml", yield readFile(metaFilePath));
        let archiveContent = yield archive.generateAsync({type: "binarystring"});
        yield writeFile(generatedFilePath, archiveContent, "binary");
    }

    /**
     * Build manga HTML files
     *
     * @param   {string}    directoryPath       Directory containing images
     * @param   {string}    destinationPath     Destination directory path
     * @return  {Array}                         File paths
     */
    *buildMangaHtmlFiles(directoryPath:string, destinationPath:string)
    {
        const imageFileNames = yield readdir(directoryPath);

        let filePaths = [];
        let width = 1608;
        let height = 2172;
        let index = 1;

        for (let imageFileName of imageFileNames) {
            let imagePath = `${directoryPath}/${imageFileName}`;

            let content = `<?xml version="1.0" encoding="UTF-8"?>\n`;
            content += `<!DOCTYPE html>\n`;
            content += `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\n`;
            content += `<head>`;
            content += `<title>Coucou</title>`;
            content += `<link href="style.css" type="text/css" rel="stylesheet"/>`;
            content += `<meta name="viewport" content="width=${width}, height=${height}"/>`;
            content += `<style type="text/css">html, body { margin: 0; padding: 0 } .page { width: ${width}px; height: ${height}px }</style>`;
            content += `</head>`;
            content += `<body style="background-image: url(images/${imageFileName})">`;

            // Build panel view
            content += yield this.getImagePanelView(imagePath, width, height);

            content += `</body>`;
            content += `</html>`;

            let generatedFilePath = `${destinationPath}/${printf("%05d", index)}.xhtml`;
            yield writeFile(generatedFilePath, content);
            filePaths.push(generatedFilePath);

            index++;
        }

        return filePaths;
    }

    *getImagePanelView(imagePath:string, pageWidth:uint32, pageHeight:uint32)
    {
        let imageWidth = 1608;
        let imageHeight = 2172;
        let panelViewWidth = Math.floor(pageWidth / 2 - imageWidth / 2) / pageWidth * 100;
        let panelViewHeight = Math.floor(pageHeight / 2 - imageHeight / 2) / pageHeight * 100;

        let content = `<div id="PV">`;
        content += `</div>`;

        return content;
    }

    *buildNavFile(filePaths, generatedFilePath:string, title:string)
    {
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

        for (let index in filePaths) {
            let filePath = filePaths[index];
            let fileName = basename(filePath);
            let fileTitle = printf("%05d", index);
            content += `<li><a href="${fileName}">${fileTitle}</a></li>\n`;
        }

        content += `</ol>\n`;
        content += `</nav>\n`;
        content += `<nav epub:type="page-list">\n`;
        content += `<ol>\n`;

        for (let index in filePaths) {
            let filePath = filePaths[index];
            let fileName = basename(filePath);
            let fileTitle = printf("%05d", index);
            content += `<li><a href="${fileName}">${fileTitle}</a></li>\n`;
        }

        content += `</ol>\n`;
        content += `</nav>\n`;
        content += `</body>\n`;
        content += `</html>\n`;

        yield writeFile(generatedFilePath, content);
    }

    *buildNcxFile(filePaths, generatedFilePath:string, uuid:string, title:string)
    {
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
            let fileTitle = fileId;
            content += `<navPoint id="${fileId}"><navLabel><text>${fileTitle}</text></navLabel><content src="${fileName}"/></navPoint>\n`;
        }

        content += `</navMap>\n`;
        content += `</ncx>`;

        yield writeFile(generatedFilePath, content);
    }

    *buildOpfFile(imageFilePaths, htmlFilePaths, generatedFilePath:string, uuid:string, title:string)
    {
        let width = 1608;
        let height = 2172;
        let writingMode = "horizontal-rl";

        let content = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        content += `<package version="3.0" unique-identifier="BookID" xmlns="http://www.idpf.org/2007/opf">\n`;
        content += `<metadata xmlns:opf="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/">\n`;
        content += `<dc:title>${title}</dc:title>\n`;
        content += `<dc:language>en-US</dc:language>\n`;
        content += `<dc:identifier id="BookID">urn:uuid:${uuid}</dc:identifier>\n`;
        content += `<dc:contributor id="contributor">Kindlegen</dc:contributor>\n`;
        content += `<meta property="rendition:orientation">portrait</meta>\n`;
        content += `<meta property="rendition:spread">portrait</meta>\n`;
        content += `<meta property="rendition:layout">pre-paginated</meta>\n`;
        content += `<meta name="original-resolution" content="${width}x${height}"/>\n`;
        content += `<meta name="book-type" content="comic"/>\n`;
        content += `<meta name="RegionMagnification" content="true"/>\n`;
        content += `<meta name="primary-writing-mode" content="${writingMode}"/>\n`;
        content += `<meta name="zero-gutter" content="true"/>\n`;
        content += `<meta name="zero-margin" content="true"/>\n`;
        content += `<meta name="ke-border-color" content="#ffffff"/>\n`;
        content += `<meta name="ke-border-width" content="0"/>\n`;
        content += `</metadata>`;
        content += `<manifest>`;

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
        content += `<spine page-progression-direction="rtl">`;

        for (let index in htmlFilePaths) {
            content += `<itemref idref="page_${index}"/>`;
        }

        content += `</spine>`;
        content += `</package>`;

        yield writeFile(generatedFilePath, content);
    }

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
}
