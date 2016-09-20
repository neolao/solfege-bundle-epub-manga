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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * EPUB builder
 */
class EpubBuilder {
    /**
     * Constructor
     */
    constructor() {}

    /**
     * Build a manga in EPUB format
     *
     * @param   {string}    directoryPath       Directory containing images
     * @param   {string}    generatedFilePath   File to generate
     * @param   {string}    title               Title
     */
    *build(directoryPath, generatedFilePath, title) {
        if (!(typeof directoryPath === 'string')) {
            throw new TypeError("Value of argument \"directoryPath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(directoryPath));
        }

        if (!(typeof generatedFilePath === 'string')) {
            throw new TypeError("Value of argument \"generatedFilePath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(generatedFilePath));
        }

        if (!(typeof title === 'string')) {
            throw new TypeError("Value of argument \"title\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(title));
        }

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

            // Copy stylesheet
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

        var styleFilePath = tempDirectory + "/style.css";
        yield (0, _coFsExtra.copy)(__dirname + "/epub/style.css", styleFilePath);

        // Build HTML files
        var htmlFilePaths = yield this.buildMangaHtmlFiles(imagesPath, tempDirectory);

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

        archive.file("style.css", (yield (0, _coFsExtra.readFile)(styleFilePath)));
        archive.file("nav.xhtml", (yield (0, _coFsExtra.readFile)(navFilePath)));
        archive.file("toc.ncx", (yield (0, _coFsExtra.readFile)(ncxFilePath)));
        archive.file("content.opf", (yield (0, _coFsExtra.readFile)(opfFilePath)));
        archive.file("META_INF/container.xml", (yield (0, _coFsExtra.readFile)(metaFilePath)));
        var archiveContent = yield archive.generateAsync({ type: "binarystring" });
        yield (0, _coFsExtra.writeFile)(generatedFilePath, archiveContent, "binary");
    }

    /**
     * Build manga HTML files
     *
     * @param   {string}    directoryPath       Directory containing images
     * @param   {string}    destinationPath     Destination directory path
     * @return  {Array}                         File paths
     */
    *buildMangaHtmlFiles(directoryPath, destinationPath) {
        if (!(typeof directoryPath === 'string')) {
            throw new TypeError("Value of argument \"directoryPath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(directoryPath));
        }

        if (!(typeof destinationPath === 'string')) {
            throw new TypeError("Value of argument \"destinationPath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(destinationPath));
        }

        var imageFileNames = yield (0, _coFsExtra.readdir)(directoryPath);

        var filePaths = [];
        var width = 1608;
        var height = 2172;
        var index = 1;

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
                content += "<title>Coucou</title>";
                content += "<link href=\"style.css\" type=\"text/css\" rel=\"stylesheet\"/>";
                content += "<meta name=\"viewport\" content=\"width=" + width + ", height=" + height + "\"/>";
                content += "<style type=\"text/css\">html, body { margin: 0; padding: 0 } .page { width: " + width + "px; height: " + height + "px }</style>";
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

        var imageWidth = 1608;
        var imageHeight = 2172;
        var panelViewWidth = Math.floor(pageWidth / 2 - imageWidth / 2) / pageWidth * 100;
        var panelViewHeight = Math.floor(pageHeight / 2 - imageHeight / 2) / pageHeight * 100;

        var content = "<div id=\"PV\">";
        content += "</div>";

        return content;
    }

    *buildNavFile(filePaths, generatedFilePath, title) {
        if (!(typeof generatedFilePath === 'string')) {
            throw new TypeError("Value of argument \"generatedFilePath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(generatedFilePath));
        }

        if (!(typeof title === 'string')) {
            throw new TypeError("Value of argument \"title\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(title));
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

        for (var index in filePaths) {
            var filePath = filePaths[index];
            var fileName = (0, _path.basename)(filePath);
            var fileTitle = (0, _printf2.default)("%05d", index);
            content += "<li><a href=\"" + fileName + "\">" + fileTitle + "</a></li>\n";
        }

        content += "</ol>\n";
        content += "</nav>\n";
        content += "<nav epub:type=\"page-list\">\n";
        content += "<ol>\n";

        for (var _index in filePaths) {
            var _filePath = filePaths[_index];
            var _fileName = (0, _path.basename)(_filePath);
            var _fileTitle = (0, _printf2.default)("%05d", _index);
            content += "<li><a href=\"" + _fileName + "\">" + _fileTitle + "</a></li>\n";
        }

        content += "</ol>\n";
        content += "</nav>\n";
        content += "</body>\n";
        content += "</html>\n";

        yield (0, _coFsExtra.writeFile)(generatedFilePath, content);
    }

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

        var content = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        content += "<ncx version=\"2005-1\" xml:lang=\"en-US\" xmlns=\"http://www.daisy.org/z3986/2005/ncx/\">\n";
        content += "<head>\n";
        content += "<meta name=\"dtb:uid\" content=\"urn:uuid:" + uuid + "\"/>\n";
        content += "<meta name=\"dtb:depth\" content=\"1\"/>\n";
        content += "<meta name=\"dtb:totalPageCount\" content=\"0\"/>\n";
        content += "<meta name=\"dtb:maxPageNumber\" content=\"0\"/>\n";
        content += "<meta name=\"generated\" content=\"true\"/>\n";
        content += "</head>\n";
        content += "<docTitle><text>" + title + "</text></docTitle>\n";
        content += "<navMap>\n";

        for (var index in filePaths) {
            var filePath = filePaths[index];
            var fileName = (0, _path.basename)(filePath);
            var fileId = (0, _printf2.default)("%05d", index);
            var fileTitle = fileId;
            content += "<navPoint id=\"" + fileId + "\"><navLabel><text>" + fileTitle + "</text></navLabel><content src=\"" + fileName + "\"/></navPoint>\n";
        }

        content += "</navMap>\n";
        content += "</ncx>";

        yield (0, _coFsExtra.writeFile)(generatedFilePath, content);
    }

    *buildOpfFile(imageFilePaths, htmlFilePaths, generatedFilePath, uuid, title) {
        if (!(typeof generatedFilePath === 'string')) {
            throw new TypeError("Value of argument \"generatedFilePath\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(generatedFilePath));
        }

        if (!(typeof uuid === 'string')) {
            throw new TypeError("Value of argument \"uuid\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(uuid));
        }

        if (!(typeof title === 'string')) {
            throw new TypeError("Value of argument \"title\" violates contract.\n\nExpected:\nstring\n\nGot:\n" + _inspect(title));
        }

        var width = 1608;
        var height = 2172;
        var writingMode = "horizontal-rl";

        var content = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        content += "<package version=\"3.0\" unique-identifier=\"BookID\" xmlns=\"http://www.idpf.org/2007/opf\">\n";
        content += "<metadata xmlns:opf=\"http://www.idpf.org/2007/opf\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n";
        content += "<dc:title>" + title + "</dc:title>\n";
        content += "<dc:language>en-US</dc:language>\n";
        content += "<dc:identifier id=\"BookID\">urn:uuid:" + uuid + "</dc:identifier>\n";
        content += "<dc:contributor id=\"contributor\">Kindlegen</dc:contributor>\n";
        content += "<meta property=\"rendition:orientation\">portrait</meta>\n";
        content += "<meta property=\"rendition:spread\">portrait</meta>\n";
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

        content += "<item id=\"ncx\" href=\"toc.ncx\" media-type=\"application/x-dtbncx+xml\"/>\n";
        content += "<item id=\"nav\" href=\"nav.xhtml\" properties=\"nav\" media-type=\"application/xhtml+xml\"/>\n";

        for (var index in imageFilePaths) {
            var filePath = imageFilePaths[index];
            var fileName = (0, _path.basename)(filePath);
            var fileMime = _mime2.default.lookup(filePath);
            content += "<item id=\"image_" + index + "\" href=\"images/" + fileName + "\" media-type=\"" + fileMime + "\"/>";
        }

        for (var _index2 in htmlFilePaths) {
            var _filePath2 = htmlFilePaths[_index2];
            var _fileName2 = (0, _path.basename)(_filePath2);
            content += "<item id=\"page_" + _index2 + "\" href=\"" + _fileName2 + "\" media-type=\"application/xhtml+xml\"/>";
        }

        content += "</manifest>";
        content += "<spine page-progression-direction=\"rtl\">";

        for (var _index3 in htmlFilePaths) {
            content += "<itemref idref=\"page_" + _index3 + "\"/>";
        }

        content += "</spine>";
        content += "</package>";

        yield (0, _coFsExtra.writeFile)(generatedFilePath, content);
    }

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