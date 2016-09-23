"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _os = require("os");

var _os2 = _interopRequireDefault(_os);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _path = require("path");

var _coFsExtra = require("co-fs-extra");

var _printf = require("printf");

var _printf2 = _interopRequireDefault(_printf);

var _uuid = require("uuid");

var _uuid2 = _interopRequireDefault(_uuid);

var _mime = require("mime");

var _mime2 = _interopRequireDefault(_mime);

var _jszip = require("jszip");

var _jszip2 = _interopRequireDefault(_jszip);

var _imageSize = require("image-size");

var _imageSize2 = _interopRequireDefault(_imageSize);

var _sharp = require("sharp");

var _sharp2 = _interopRequireDefault(_sharp);

var _textToSvg = require("text-to-svg");

var _textToSvg2 = _interopRequireDefault(_textToSvg);

var _svg2png = require("svg2png");

var _svg2png2 = _interopRequireDefault(_svg2png);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * EPUB builder
 */
class EpubBuilder {

    /**
     * Constructor
     */
    constructor() {
        this.defaultOptions = {
            width: 1072,
            height: 1448,
            direction: "rtl",
            author: "EPUB Manga Generator"
        };
    }

    /**
     * Build a manga in EPUB format
     *
     * @param   {string}    directoryPath       Directory containing images
     * @param   {string}    generatedFilePath   File to generate
     * @param   {string}    title               Title
     * @param   {object}    options             Options
     */

    // Default options
    *build(directoryPath, generatedFilePath, title) {
        var options = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

        if (!(typeof directoryPath === 'string')) {
            throw new TypeError("Value of argument \"directoryPath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(directoryPath));
        }

        if (!(typeof generatedFilePath === 'string')) {
            throw new TypeError("Value of argument \"generatedFilePath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(generatedFilePath));
        }

        if (!(typeof title === 'string')) {
            throw new TypeError("Value of argument \"title\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(title));
        }

        if (!(options instanceof Object)) {
            throw new TypeError("Value of argument \"options\" violates contract.\n\nExpected:\nObject\n\nGot:\n" + _inspect(options));
        }

        // Default options
        options = Object.assign({}, this.defaultOptions, options);

        // Metadata
        var uuid = _uuid2.default.v4();

        // Build temporary directory
        var tempDirectory = _fs2.default.mkdtempSync(_os2.default.tmpdir() + "/epub-manga-");

        // Copy images
        var imagesPath = tempDirectory + "/images";
        yield (0, _coFsExtra.copy)(directoryPath, imagesPath);
        var imageFileNames = yield (0, _coFsExtra.readdir)(imagesPath);
        var imageFilePaths = [];

        if (!(imageFileNames && (typeof imageFileNames[Symbol.iterator] === 'function' || Array.isArray(imageFileNames)))) {
            throw new TypeError("Expected imageFileNames to be iterable, got " + _inspect(imageFileNames));
        }

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = imageFileNames[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var imageFileName = _step.value;

                imageFilePaths.push(imagesPath + "/" + imageFileName);
            }

            // Resize images
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                    _iterator.return();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }

        yield this.resizeImages(imageFilePaths, options.width, options.height);

        // Build cover
        var coverFilePath = tempDirectory + "/cover.jpg";
        yield this.buildCover(imageFilePaths[0], coverFilePath, title);

        // Copy stylesheet
        var styleFilePath = tempDirectory + "/style.css";
        yield (0, _coFsExtra.copy)(__dirname + "/epub/style.css", styleFilePath);

        // Build HTML files
        var htmlFilePaths = yield this.buildMangaHtmlFiles(imagesPath, tempDirectory, title, options);

        // Build NAV file
        var navFilePath = tempDirectory + "/nav.xhtml";
        yield this.buildNavFile(htmlFilePaths, navFilePath, title);

        // Build NCX file
        var ncxFilePath = tempDirectory + "/toc.ncx";
        yield this.buildNcxFile(htmlFilePaths, ncxFilePath, uuid, title);

        // Build OPF file
        var opfFilePath = tempDirectory + "/content.opf";
        yield this.buildOpfFile(imageFilePaths, htmlFilePaths, opfFilePath, uuid, title);

        // Build META-INF
        var metaFilePath = tempDirectory + "/META-INF/container.xml";
        yield this.buildMetaFile(metaFilePath);

        // Zip files
        var archive = new _jszip2.default();

        if (!(imageFileNames && (typeof imageFileNames[Symbol.iterator] === 'function' || Array.isArray(imageFileNames)))) {
            throw new TypeError("Expected imageFileNames to be iterable, got " + _inspect(imageFileNames));
        }

        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
            for (var _iterator2 = imageFileNames[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var _imageFileName = _step2.value;

                var imageContent = yield (0, _coFsExtra.readFile)(imagesPath + "/" + _imageFileName);
                archive.file("images/" + _imageFileName, imageContent, { binary: true });
            }
        } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                    _iterator2.return();
                }
            } finally {
                if (_didIteratorError2) {
                    throw _iteratorError2;
                }
            }
        }

        if (!(htmlFilePaths && (typeof htmlFilePaths[Symbol.iterator] === 'function' || Array.isArray(htmlFilePaths)))) {
            throw new TypeError("Expected htmlFilePaths to be iterable, got " + _inspect(htmlFilePaths));
        }

        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
            for (var _iterator3 = htmlFilePaths[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                var htmlFilePath = _step3.value;

                var fileName = (0, _path.basename)(htmlFilePath);
                var fileContent = yield (0, _coFsExtra.readFile)(htmlFilePath);
                archive.file(fileName, fileContent);
            }
        } catch (err) {
            _didIteratorError3 = true;
            _iteratorError3 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                    _iterator3.return();
                }
            } finally {
                if (_didIteratorError3) {
                    throw _iteratorError3;
                }
            }
        }

        archive.file("cover.jpg", (yield (0, _coFsExtra.readFile)(coverFilePath)));
        archive.file("style.css", (yield (0, _coFsExtra.readFile)(styleFilePath)));
        archive.file("nav.xhtml", (yield (0, _coFsExtra.readFile)(navFilePath)));
        archive.file("toc.ncx", (yield (0, _coFsExtra.readFile)(ncxFilePath)));
        archive.file("content.opf", (yield (0, _coFsExtra.readFile)(opfFilePath)));
        archive.file("META_INF/container.xml", (yield (0, _coFsExtra.readFile)(metaFilePath)));
        var archiveContent = yield archive.generateAsync({ type: "binarystring" });
        yield (0, _coFsExtra.writeFile)(generatedFilePath, archiveContent, "binary");

        // Delete temporary directory
        yield (0, _coFsExtra.remove)(tempDirectory);
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
    *buildMangaHtmlFiles(directoryPath, destinationPath, title) {
        var options = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

        if (!(typeof directoryPath === 'string')) {
            throw new TypeError("Value of argument \"directoryPath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(directoryPath));
        }

        if (!(typeof destinationPath === 'string')) {
            throw new TypeError("Value of argument \"destinationPath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(destinationPath));
        }

        if (!(typeof title === 'string')) {
            throw new TypeError("Value of argument \"title\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(title));
        }

        if (!(options instanceof Object)) {
            throw new TypeError("Value of argument \"options\" violates contract.\n\nExpected:\nObject\n\nGot:\n" + _inspect(options));
        }

        // Default options
        options = Object.assign({}, this.defaultOptions, options);

        var filePaths = [];
        var width = options.width;
        var height = options.width;
        var index = 1;

        var imageFileNames = yield (0, _coFsExtra.readdir)(directoryPath);

        if (!(imageFileNames && (typeof imageFileNames[Symbol.iterator] === 'function' || Array.isArray(imageFileNames)))) {
            throw new TypeError("Expected imageFileNames to be iterable, got " + _inspect(imageFileNames));
        }

        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
            for (var _iterator4 = imageFileNames[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                var imageFileName = _step4.value;

                var imagePath = directoryPath + "/" + imageFileName;

                var content = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
                content += "<!DOCTYPE html>\n";
                content += "<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:epub=\"http://www.idpf.org/2007/ops\">\n";
                content += "<head>";
                content += "<title>" + title + "</title>";
                content += "<link href=\"style.css\" type=\"text/css\" rel=\"stylesheet\"/>";
                content += "<meta name=\"viewport\" content=\"width=" + width + ", height=" + height + "\"/>";
                content += "</head>";
                content += "<body style=\"background-image: url(images/" + imageFileName + ")\">";

                // Build panel view
                content += yield this.getImagePanelView(imagePath, width, height);

                content += "</body>";
                content += "</html>";

                var generatedFilePath = destinationPath + "/" + (0, _printf2.default)("%05d", index) + ".xhtml";
                yield (0, _coFsExtra.writeFile)(generatedFilePath, content);
                filePaths.push(generatedFilePath);

                index++;
            }
        } catch (err) {
            _didIteratorError4 = true;
            _iteratorError4 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion4 && _iterator4.return) {
                    _iterator4.return();
                }
            } finally {
                if (_didIteratorError4) {
                    throw _iteratorError4;
                }
            }
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
    *getImagePanelView(imagePath, pageWidth, pageHeight) {
        if (!(typeof imagePath === 'string')) {
            throw new TypeError("Value of argument \"imagePath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(imagePath));
        }

        if (!(typeof pageWidth === 'number' && !isNaN(pageWidth) && pageWidth >= 0 && pageWidth <= 4294967295 && pageWidth === Math.floor(pageWidth))) {
            throw new TypeError("Value of argument \"pageWidth\" violates contract.\n\nExpected:\nuint32\n\nGot:\n" + _inspect(pageWidth));
        }

        if (!(typeof pageHeight === 'number' && !isNaN(pageHeight) && pageHeight >= 0 && pageHeight <= 4294967295 && pageHeight === Math.floor(pageHeight))) {
            throw new TypeError("Value of argument \"pageHeight\" violates contract.\n\nExpected:\nuint32\n\nGot:\n" + _inspect(pageHeight));
        }

        var imageDimension = (0, _imageSize2.default)(imagePath);
        var imageWidth = imageDimension.width;
        var imageHeight = imageDimension.height;
        var panelViewWidth = Math.floor(pageWidth / 2 - imageWidth / 2) / pageWidth * 100;
        var panelViewHeight = Math.floor(pageHeight / 2 - imageHeight / 2) / pageHeight * 100;

        var content = "<div id=\"PV\">";
        content += "</div>";

        return content;
    }

    /**
     * Build nav file
     *
     * @param   {Array}     filePaths           Page file paths
     * @param   {string}    generatedFilePath   Generated file path
     * @param   {string}    title               Manga title
     */
    *buildNavFile(filePaths, generatedFilePath, title) {
        if (!(typeof generatedFilePath === 'string')) {
            throw new TypeError("Value of argument \"generatedFilePath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(generatedFilePath));
        }

        if (!(typeof title === 'string')) {
            throw new TypeError("Value of argument \"title\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(title));
        }

        var items = "";
        for (var index in filePaths) {
            var filePath = filePaths[index];
            var fileName = (0, _path.basename)(filePath);
            var fileTitle = index + 1;
            items += "<li><a href=\"" + fileName + "\">" + fileTitle + "</a></li>\n";
        }

        var content = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n";
        content += "<!DOCTYPE html>\n";
        content += "<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:epub=\"http://www.idpf.org/2007/ops\">\n";
        content += "<head>\n";
        content += "<title>" + title + "</title>\n";
        content += "<meta charset=\"utf-8\"/>\n";
        content += "</head>\n";
        content += "<body>\n";
        content += "<nav xmlns:epub=\"http://www.idpf.org/2007/ops\" epub:type=\"toc\" id=\"toc\">\n";
        content += "<ol>\n";
        content += items;
        content += "</ol>\n";
        content += "</nav>\n";
        content += "<nav epub:type=\"page-list\">\n";
        content += "<ol>\n";
        content += items;
        content += "</ol>\n";
        content += "</nav>\n";
        content += "</body>\n";
        content += "</html>\n";

        yield (0, _coFsExtra.writeFile)(generatedFilePath, content);
    }

    /**
     * Build NCX file
     *
     * @param   {Array}     filePaths           Page file paths
     * @param   {string}    generatedFilePath   Generated file path
     * @param   {string}    uuid                Manga UUID
     * @param   {string}    title               Manga title
     */
    *buildNcxFile(filePaths, generatedFilePath, uuid, title) {
        if (!(typeof generatedFilePath === 'string')) {
            throw new TypeError("Value of argument \"generatedFilePath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(generatedFilePath));
        }

        if (!(typeof uuid === 'string')) {
            throw new TypeError("Value of argument \"uuid\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(uuid));
        }

        if (!(typeof title === 'string')) {
            throw new TypeError("Value of argument \"title\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(title));
        }

        var pageCount = filePaths.length;
        var maxPageNumber = pageCount + 1;

        var content = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        content += "<ncx version=\"2005-1\" xml:lang=\"en-US\" xmlns=\"http://www.daisy.org/z3986/2005/ncx/\">\n";
        content += "<head>\n";
        content += "<meta name=\"dtb:uid\" content=\"urn:uuid:" + uuid + "\"/>\n";
        content += "<meta name=\"dtb:depth\" content=\"1\"/>\n";
        content += "<meta name=\"dtb:totalPageCount\" content=\"" + pageCount + "\"/>\n";
        content += "<meta name=\"dtb:maxPageNumber\" content=\"" + maxPageNumber + "\"/>\n";
        content += "<meta name=\"generated\" content=\"true\"/>\n";
        content += "</head>\n";
        content += "<docTitle><text>" + title + "</text></docTitle>\n";
        content += "<navMap>\n";

        for (var index in filePaths) {
            var filePath = filePaths[index];
            var fileName = (0, _path.basename)(filePath);
            var fileId = (0, _printf2.default)("%05d", index);
            var fileTitle = index + 1;
            content += "<navPoint id=\"" + fileId + "\"><navLabel><text>" + fileTitle + "</text></navLabel><content src=\"" + fileName + "\"/></navPoint>\n";
        }

        content += "</navMap>\n";
        content += "</ncx>";

        yield (0, _coFsExtra.writeFile)(generatedFilePath, content);
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
    *buildOpfFile(imageFilePaths, htmlFilePaths, generatedFilePath, uuid, title) {
        var options = arguments.length <= 5 || arguments[5] === undefined ? {} : arguments[5];

        if (!(typeof generatedFilePath === 'string')) {
            throw new TypeError("Value of argument \"generatedFilePath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(generatedFilePath));
        }

        if (!(typeof uuid === 'string')) {
            throw new TypeError("Value of argument \"uuid\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(uuid));
        }

        if (!(typeof title === 'string')) {
            throw new TypeError("Value of argument \"title\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(title));
        }

        if (!(options instanceof Object)) {
            throw new TypeError("Value of argument \"options\" violates contract.\n\nExpected:\nObject\n\nGot:\n" + _inspect(options));
        }

        // Default options
        options = Object.assign({}, this.defaultOptions, options);

        var width = options.width;
        var height = options.height;
        var writingMode = "horizontal-rl";
        if (options.direction === "ltr") {
            writingMode = "horizontal-lr";
        }
        var orientation = "portrait";
        var author = options.author;

        var content = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        content += "<package version=\"3.0\" unique-identifier=\"BookID\" xmlns=\"http://www.idpf.org/2007/opf\">\n";
        content += "<metadata xmlns:opf=\"http://www.idpf.org/2007/opf\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n";
        content += "<dc:title>" + title + "</dc:title>\n";
        content += "<dc:language>en-US</dc:language>\n";
        content += "<dc:identifier id=\"BookID\">urn:uuid:" + uuid + "</dc:identifier>\n";
        content += "<dc:contributor id=\"contributor\">" + author + "</dc:contributor>\n";
        content += "<meta name=\"cover\" content=\"cover\"/>\n";
        content += "<meta property=\"rendition:orientation\">" + orientation + "</meta>\n";
        content += "<meta property=\"rendition:spread\">" + orientation + "</meta>\n";
        content += "<meta property=\"rendition:layout\">pre-paginated</meta>\n";
        content += "<meta name=\"original-resolution\" content=\"" + width + "x" + height + "\"/>\n";
        content += "<meta name=\"book-type\" content=\"comic\"/>\n";
        content += "<meta name=\"RegionMagnification\" content=\"true\"/>\n";
        content += "<meta name=\"primary-writing-mode\" content=\"" + writingMode + "\"/>\n";
        content += "<meta name=\"zero-gutter\" content=\"true\"/>\n";
        content += "<meta name=\"zero-margin\" content=\"true\"/>\n";
        content += "<meta name=\"ke-border-color\" content=\"#ffffff\"/>\n";
        content += "<meta name=\"ke-border-width\" content=\"0\"/>\n";
        content += "</metadata>";
        content += "<manifest>";

        content += "<item id=\"cover\" href=\"cover.jpg\" media-type=\"image/jpeg\" properties=\"cover-image\"/>\n";
        content += "<item id=\"ncx\" href=\"toc.ncx\" media-type=\"application/x-dtbncx+xml\"/>\n";
        content += "<item id=\"nav\" href=\"nav.xhtml\" properties=\"nav\" media-type=\"application/xhtml+xml\"/>\n";

        for (var index in imageFilePaths) {
            var filePath = imageFilePaths[index];
            var fileName = (0, _path.basename)(filePath);
            var fileMime = _mime2.default.lookup(filePath);
            content += "<item id=\"image_" + index + "\" href=\"images/" + fileName + "\" media-type=\"" + fileMime + "\"/>";
        }

        for (var _index in htmlFilePaths) {
            var _filePath = htmlFilePaths[_index];
            var _fileName = (0, _path.basename)(_filePath);
            content += "<item id=\"page_" + _index + "\" href=\"" + _fileName + "\" media-type=\"application/xhtml+xml\"/>";
        }

        content += "</manifest>";
        content += "<spine page-progression-direction=\"rtl\">";

        for (var _index2 in htmlFilePaths) {
            content += "<itemref idref=\"page_" + _index2 + "\"/>";
        }

        content += "</spine>";
        content += "</package>";

        yield (0, _coFsExtra.writeFile)(generatedFilePath, content);
    }

    /**
     * Build meta file
     *
     * @param   {string}    filePath    Generated file path
     */
    *buildMetaFile(filePath) {
        if (!(typeof filePath === 'string')) {
            throw new TypeError("Value of argument \"filePath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(filePath));
        }

        var content = "<?xml version=\"1.0\"?>\n";
        content += "<container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\">\n";
        content += "<rootfiles>\n";
        content += "<rootfile full-path=\"content.opf\" media-type=\"application/oebps-package+xml\"/>\n";
        content += "</rootfiles>\n";
        content += "</container>\n";

        yield (0, _coFsExtra.outputFile)(filePath, content);
    }

    /**
     * Resize images
     *
     * @param   {Array}     filePaths   Image file paths
     * @param   {uint32}    width       Image width
     * @param   {uint32}    height      Image height
     */
    *resizeImages(filePaths, width, height) {
        if (!(typeof width === 'number' && !isNaN(width) && width >= 0 && width <= 4294967295 && width === Math.floor(width))) {
            throw new TypeError("Value of argument \"width\" violates contract.\n\nExpected:\nuint32\n\nGot:\n" + _inspect(width));
        }

        if (!(typeof height === 'number' && !isNaN(height) && height >= 0 && height <= 4294967295 && height === Math.floor(height))) {
            throw new TypeError("Value of argument \"height\" violates contract.\n\nExpected:\nuint32\n\nGot:\n" + _inspect(height));
        }

        if (!(filePaths && (typeof filePaths[Symbol.iterator] === 'function' || Array.isArray(filePaths)))) {
            throw new TypeError("Expected filePaths to be iterable, got " + _inspect(filePaths));
        }

        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;
        var _iteratorError5 = undefined;

        try {
            for (var _iterator5 = filePaths[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                var filePath = _step5.value;

                var tempImagePath = filePath + ".tmp";
                var image = (0, _sharp2.default)(filePath);

                // Resize the image
                // White background
                yield image.resize(width, height).embed().background({ r: 255, g: 255, b: 255, a: 1 }).toFile(tempImagePath);

                // Override file
                yield (0, _coFsExtra.move)(tempImagePath, filePath, { clobber: true });
            }
        } catch (err) {
            _didIteratorError5 = true;
            _iteratorError5 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion5 && _iterator5.return) {
                    _iterator5.return();
                }
            } finally {
                if (_didIteratorError5) {
                    throw _iteratorError5;
                }
            }
        }
    }

    /**
     * Build cover
     *
     * @param   {string}    imageFilePath       Source file path
     * @param   {string}    generatedFilePath   Cover file path
     * @param   {string}    title               Cover title
     */
    *buildCover(imageFilePath, generatedFilePath) {
        var title = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

        if (!(typeof imageFilePath === 'string')) {
            throw new TypeError("Value of argument \"imageFilePath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(imageFilePath));
        }

        if (!(typeof generatedFilePath === 'string')) {
            throw new TypeError("Value of argument \"generatedFilePath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(generatedFilePath));
        }

        if (!(title == null || typeof title === 'string')) {
            throw new TypeError("Value of argument \"title\" violates contract.\n\nExpected:\n?string\n\nGot:\n" + _inspect(title));
        }

        var dimension = (0, _imageSize2.default)(imageFilePath);
        var imageMime = _mime2.default.lookup(imageFilePath);

        // Get base64
        var imageContent = yield (0, _coFsExtra.readFile)(imageFilePath);
        var buffer = Buffer.from(imageContent);
        var base64 = buffer.toString("base64");

        // Build title SVG
        var titleSvg = "";
        if (typeof title === "string" && title.length > 0) {
            titleSvg = this.getCoverTitleSvg(title, dimension.width, dimension.height);
        }

        // Build SVG content
        var svgContent = "<svg id=\"example1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"" + dimension.width + "\" height=\"" + dimension.height + "\">\n            <image x=\"0\" y=\"0\" width=\"" + dimension.width + "\" height=\"" + dimension.height + "\" xlink:href=\"data:" + imageMime + ";base64," + base64 + "\"/>\n            " + titleSvg + "\n        </svg>";

        // Generate image
        var svgBuffer = Buffer.from(svgContent);
        var pngBuffer = yield (0, _svg2png2.default)(svgBuffer);
        var svg = (0, _sharp2.default)(pngBuffer);
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
    getCoverTitleSvg(title, containerWidth, containerHeight) {
        if (!(typeof title === 'string')) {
            throw new TypeError("Value of argument \"title\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(title));
        }

        if (!(typeof containerWidth === 'number' && !isNaN(containerWidth) && containerWidth >= 0 && containerWidth <= 4294967295 && containerWidth === Math.floor(containerWidth))) {
            throw new TypeError("Value of argument \"containerWidth\" violates contract.\n\nExpected:\nuint32\n\nGot:\n" + _inspect(containerWidth));
        }

        if (!(typeof containerHeight === 'number' && !isNaN(containerHeight) && containerHeight >= 0 && containerHeight <= 4294967295 && containerHeight === Math.floor(containerHeight))) {
            throw new TypeError("Value of argument \"containerHeight\" violates contract.\n\nExpected:\nuint32\n\nGot:\n" + _inspect(containerHeight));
        }

        var textToSVG = _textToSvg2.default.loadSync();
        var textOptions = {
            x: Math.round(containerWidth / 2),
            y: Math.round(containerHeight / 2),
            fontSize: 100,
            anchor: "center baseline",
            attributes: {
                fill: "#ffffff"
            }
        };

        // Build the text path in one line
        var margin = 100;
        var textPath = textToSVG.getPath(title, textOptions);
        var textMetrics = textToSVG.getMetrics(title, textOptions);
        if (textMetrics.width < containerWidth - margin) {
            return "<rect x=\"" + (textMetrics.x - 10) + "\" y=\"" + (textMetrics.y - 10) + "\" width=\"" + (textMetrics.width + 20) + "\" height=\"" + (textMetrics.height + 20) + "\" fill=\"#000000\"/>\n                " + textPath + "\n            ";
        }

        // The text is too long
        // We have to split it in several lines
        var lineHeight = textMetrics.height;
        var lineCount = Math.ceil(textMetrics.width / (containerWidth - margin));
        var linesHeight = lineHeight * lineCount;
        var words = title.split(" ");
        var wordCount = words.length;
        var wordPerLine = Math.ceil(wordCount / lineCount);
        var lines = [];
        for (var lineIndex = 0; lineIndex < lineCount; lineIndex++) {
            var start = lineIndex * wordPerLine;
            var end = start + wordPerLine;
            var line = words.slice(start, end);
            lines.push(line.join(" "));
        }

        var svg = "";
        for (var _lineIndex in lines) {
            var _line = lines[_lineIndex];
            var lineOptions = Object.assign({}, textOptions, {
                y: Math.round(containerHeight / 2 - linesHeight / 2 + lineHeight) + _lineIndex * lineHeight
            });
            var linePath = textToSVG.getPath(_line, lineOptions);
            var lineMetrics = textToSVG.getMetrics(_line, lineOptions);
            svg += "<rect x=\"0\" y=\"" + (lineMetrics.y - 10) + "\" width=\"" + containerWidth + "\" height=\"" + (lineMetrics.height + 20) + "\" fill=\"#000000\"/>";
            svg += linePath;
        }

        return svg;
    }
}
exports.default = EpubBuilder;

function _inspect(input) {
    function _ref2(key) {
        return (/^([A-Z_$][A-Z0-9_$]*)$/i.test(key) ? key : JSON.stringify(key)) + ': ' + _inspect(input[key]) + ';';
    }

    function _ref(item) {
        return _inspect(item) === first;
    }

    if (input === null) {
        return 'null';
    } else if (input === undefined) {
        return 'void';
    } else if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
        return typeof input === "undefined" ? "undefined" : _typeof(input);
    } else if (Array.isArray(input)) {
        if (input.length > 0) {
            var first = _inspect(input[0]);

            if (input.every(_ref)) {
                return first.trim() + '[]';
            } else {
                return '[' + input.map(_inspect).join(', ') + ']';
            }
        } else {
            return 'Array';
        }
    } else {
        var keys = Object.keys(input);

        if (!keys.length) {
            if (input.constructor && input.constructor.name && input.constructor.name !== 'Object') {
                return input.constructor.name;
            } else {
                return 'Object';
            }
        }

        var entries = keys.map(_ref2).join('\n  ');

        if (input.constructor && input.constructor.name && input.constructor.name !== 'Object') {
            return input.constructor.name + ' {\n  ' + entries + '\n}';
        } else {
            return '{ ' + entries + '\n}';
        }
    }
}

module.exports = exports['default'];