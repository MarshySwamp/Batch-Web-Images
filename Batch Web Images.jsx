/*

Batch Web Images
Copyright 2022 William Campbell
All Rights Reserved
https://www.marspremedia.com/contact

Permission to use, copy, modify, and/or distribute this software
for any purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

////////////////////////////////////////////////////////////////////////

28th November 2024
Stephen Marsh
Added WebP save format
Lossy quality value set on line 626

*/

(function () {

    var title = "Batch Web Images";

    if (!/photoshop/i.test(app.name)) {
        alert("Script for Photoshop", title, false);
        return;
    }

    app.displayDialogs = DialogModes.ERROR;

    // Script variables.
    var count;
    var doneMessage;
    var error;
    var extension;
    var extensions;
    var folderInput;
    var folderOutput;
    var format;
    var formats;
    var log;
    var progress;
    var qualities;

    // Reusable UI variables.
    var g; // group
    var p; // panel
    var w; // window

    // Permanent UI variables.
    var btnCancel;
    var btnFolderInput;
    var btnFolderOutput;
    var btnOk;
    var cbCrop;
    var cbLowercase;
    var cbMaxPixels;
    var cbRemoveBg;
    var cbRenameWeb;
    var cbReplaceOutput;
    var cbSubfolders;
    var grpMaxPixels;
    var grpPercent;
    var grpQuality;
    var grpRemoveBg;
    var inpMaxPixelsHigh;
    var inpMaxPixelsWide;
    var inpPercent;
    var inpSuffix;
    var listFormat;
    var listJpgQuality;
    var rbAlpha;
    var rbPath;
    var rbSubject;
    var txtFolderInput;
    var txtFolderOutput;

    // SETUP

    extensions = [
        "jpg",
        "png",
        "webp"
    ];
    // Create a conditional WebP dropdown
    var formats = ["JPG", "PNG"];
    if (parseFloat(app.version) >= 23) {
        formats.push("WEBP");
    };
    qualities = [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12"
    ];

    // LOG

    log = {
        entries: [],
        file: null,
        // Default write log to user desktop.
        // Preferably set 'log.path' to a meaningful
        // location in later code once location exists.
        path: Folder.desktop,
        add: function (message) {
            this.entries.push(message);
        },
        addFile: function (fileName, entries) {
            this.add(File.decode(fileName));
            if (entries instanceof Array) {
                while (entries.length) {
                    log.add("----> " + entries.shift());
                }
            } else {
                log.add("----> " + entries);
            }
        },
        cancel: function () {
            if (log.entries.length) {
                log.add("Canceled.");
            }
        },
        write: function () {
            var contents;
            var d;
            var fileName;
            var padZero = function (v) {
                return ("0" + v).slice(-2);
            };
            if (!this.entries.length) {
                // No log entries to report.
                this.file = null;
                return;
            }
            contents = this.entries.join("\r") + "\r";
            // Create file name.
            d = new Date();
            fileName =
                title +
                " Log " +
                d.getFullYear() +
                "-" +
                padZero(d.getMonth() + 1) +
                "-" +
                padZero(d.getDate()) +
                "-" +
                padZero(d.getHours()) +
                padZero(d.getMinutes()) +
                padZero(String(d.getSeconds()).substr(0, 2)) +
                ".txt";
            // Open and write log file.
            this.file = new File(this.path + "/" + fileName);
            this.file.encoding = "UTF-8";
            try {
                if (!this.file.open("w")) {
                    throw new Error("Failed to open log file.");
                }
                if (!this.file.write(contents)) {
                    throw new Error("Failed to write log file.");
                }
            } catch (e) {
                this.file = null;
                throw e;
            } finally {
                this.file.close();
            }
            // Log successfully written.
            // log.file == true (not null) indicates a log was written.
        }
    };

    // CREATE PROGRESS WINDOW

    progress = new Window("palette", "Progress");
    progress.t = progress.add("statictext");
    progress.t.preferredSize = [450, -1];
    progress.b = progress.add("progressbar");
    progress.b.preferredSize = [450, -1];
    progress.add("statictext", undefined, "Press ESC to cancel");
    progress.display = function (message) {
        message && (this.t.text = message);
        this.show();
        app.refresh();
    };
    progress.increment = function () {
        this.b.value++;
    };
    progress.set = function (steps) {
        this.b.value = 0;
        this.b.minvalue = 0;
        this.b.maxvalue = steps;
    };

    // CREATE USER INTERFACE

    w = new Window("dialog", title);
    w.alignChildren = "fill";

    // Panel 'Input'
    p = w.add("panel", undefined, "Input");
    p.alignChildren = "left";
    g = p.add("group");
    btnFolderInput = g.add("button", undefined, "Folder...");
    txtFolderInput = g.add("statictext", undefined, undefined, {
        truncate: "middle"
    });
    txtFolderInput.preferredSize = [360, -1];
    cbSubfolders = p.add("checkbox", undefined, "Include subfolders");

    // Panel 'Options'
    p = w.add("panel", undefined, "Options");
    p.alignChildren = "left";
    cbRemoveBg = p.add("checkbox", undefined, "Remove background:");
    grpRemoveBg = p.add("group");
    grpRemoveBg.margins = [24, 0, 0, 0];
    grpRemoveBg.orientation = "column";
    grpRemoveBg.alignChildren = "left";
    g = grpRemoveBg.add("group");
    rbPath = g.add("radiobutton", undefined, "Path");
    rbAlpha = g.add("radiobutton", undefined, "Alpha channel");
    rbSubject = g.add("radiobutton", undefined, "Select subject");
    g = grpRemoveBg.add("group");
    cbCrop = g.add("checkbox", undefined, "Crop:");
    grpPercent = g.add("group");
    grpPercent.add("statictext", undefined, "margin:");
    inpPercent = grpPercent.add("edittext");
    inpPercent.preferredSize = [40, -1];
    grpPercent.add("statictext", undefined, "percent of subject longest edge");
    g = p.add("group");
    cbMaxPixels = g.add("checkbox", undefined, "Maximum pixels:");
    grpMaxPixels = g.add("group");
    grpMaxPixels.margins = [1, 0, 0, 0];
    inpMaxPixelsWide = grpMaxPixels.add("edittext");
    inpMaxPixelsWide.preferredSize = [60, -1];
    grpMaxPixels.add("statictext", undefined, "w");
    inpMaxPixelsHigh = grpMaxPixels.add("edittext");
    inpMaxPixelsHigh.preferredSize = [60, -1];
    grpMaxPixels.add("statictext", undefined, "h");

    // Panel 'Output'
    p = w.add("panel", undefined, "Output");
    p.alignChildren = "left";
    g = p.add("group");
    btnFolderOutput = g.add("button", undefined, "Folder...");
    txtFolderOutput = g.add("statictext", undefined, "", {
        truncate: "middle"
    });
    txtFolderOutput.preferredSize = [360, -1];
    g = p.add("group");
    g.add("statictext", undefined, "Format:");
    listFormat = g.add("dropdownlist", undefined, formats);
    grpQuality = g.add("group");
    grpQuality.margins = [12, 0, 0, 0];
    grpQuality.add("statictext", undefined, "Quality:");
    listJpgQuality = grpQuality.add("dropdownlist", undefined, qualities);
    g = p.add("group");
    g.add("statictext", undefined, "Original file name +");
    inpSuffix = g.add("edittext");
    inpSuffix.preferredSize = [150, 23];
    g = p.add("group");
    cbRenameWeb = g.add("checkbox", undefined, "Rename for web");
    cbLowercase = g.add("checkbox", undefined, "File name lowercase");
    cbReplaceOutput = p.add("checkbox", undefined, "Replace existing output files");

    // Action Buttons
    g = w.add("group");
    g.alignment = "center";
    btnOk = g.add("button", undefined, "OK");
    btnCancel = g.add("button", undefined, "Cancel");

    // Panel Copyright
    p = w.add("panel");
    p.add("statictext", undefined, "Copyright 2022 William Campbell");

    // SET UI VALUES

    txtFolderInput.text = "";
    cbSubfolders.value = false;
    cbRemoveBg.value = true;
    rbPath.value = false;
    rbAlpha.value = false;
    rbSubject.value = true;
    cbCrop.value = true;
    inpPercent.text = "3";
    cbMaxPixels.value = true;
    inpMaxPixelsWide.text = "1200";
    inpMaxPixelsHigh.text = "800";
    txtFolderOutput.text = "";
    listFormat.selection = 1; // 0=JPG, 1=PNG, 2=WEBP
    listJpgQuality.selection = 5;
    inpSuffix.text = "";
    cbRenameWeb.value = true;
    cbLowercase.value = false;
    cbReplaceOutput.value = true;
    configureUi();

    // UI ELEMENT EVENT HANDLERS

    // Panel 'Process'
    btnFolderInput.onClick = function () {
        var f = Folder.selectDialog("Select input folder", txtFolderInput.text);
        if (f) {
            txtFolderInput.text = Folder.decode(f.fullName);
        }
    };

    // Panel 'Options'
    cbRemoveBg.onClick = configureUi;
    cbCrop.onClick = configureUi;
    inpPercent.onChange = function () {
        var s;
        var v;
        s = this.text.replace(/[^0-9,]/g, "");
        if (s != this.text || Number(this.text) > 100) {
            alert("Invalid", " ", false);
            this.text = this.prior;
        } else {
            v = Math.round(Number(s) || 0);
            this.text = v.toString();
        }
    };
    cbMaxPixels.onClick = configureUi;
    inpMaxPixelsWide.onChange = validatePixels;
    inpMaxPixelsHigh.onChange = validatePixels;

    // Panel 'Output'
    btnFolderOutput.onClick = function () {
        var f = Folder.selectDialog("Select output folder", txtFolderOutput.text);
        if (f) {
            txtFolderOutput.text = Folder.decode(f.fullName);
        }
    };
    listFormat.onChange = configureUi;
    inpSuffix.onChange = function () {
        // Trim.
        this.text = this.text.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
        // Remove illegal characters.
        var s = this.text.replace(/[\/\\:*?"<>|]/g, "");
        if (s != this.text) {
            this.text = s;
            alert("Illegal characters removed", " ", false);
        }
    };

    // Action Buttons
    btnOk.onClick = function () {
        folderInput = new Folder(txtFolderInput.text);
        if (!(folderInput && folderInput.exists)) {
            txtFolderInput.text = "";
            alert("Select input folder", " ", false);
            return;
        }
        folderOutput = new Folder(txtFolderOutput.text);
        if (!(folderOutput && folderOutput.exists)) {
            txtFolderOutput.text = "";
            alert("Select output folder", " ", false);
            return;
        }
        w.close(1);
    };
    btnCancel.onClick = function () {
        w.close(0);
    };

    // DISPLAY THE DIALOG

    if (w.show() == 1) {
        doneMessage = "";
        try {
            process();
            doneMessage = doneMessage || count + " files processed";
        } catch (e) {
            if (/User cancel/.test(e.message)) {
                log.cancel();
                doneMessage = "Canceled";
            } else {
                error = error || e;
                doneMessage = "An error has occurred.\nLine " + error.line + ": " + error.message;
            }
        }
        app.bringToFront();
        progress.close();
        try {
            log.path = folderOutput;
            log.write();
        } catch (e) {
            alert("Error writing log:\n" + e.message, title, true);
        }
        if (log.file) {
            if (
                confirm(doneMessage +
                    "\nAlerts reported. See log for details:\n" +
                    File.decode(log.file.fullName) +
                    "\n\nOpen log?", false, title)
            ) {
                log.file.execute();
            }
        } else {
            doneMessage && alert(doneMessage, title, error);
        }
    }

    //====================================================================
    //               END PROGRAM EXECUTION, BEGIN FUNCTIONS
    //====================================================================

    function configureUi() {
        grpRemoveBg.enabled = cbRemoveBg.value;
        grpPercent.enabled = cbCrop.value;
        inpPercent.prior = inpPercent.text;
        grpMaxPixels.enabled = cbMaxPixels.value;
        grpQuality.visible = listFormat.selection && listFormat.selection.index == 0; // JPG
    }

    function getFiles(folder, subfolders, extensions) {
        // folder = folder object, not folder name.
        // subfolders = true to include subfolders.
        // extensions = string, extensions to include.
        // Combine multiple extensions with RegExp OR i.e. jpg|psd|tif
        // extensions case-insensitive.
        // extensions undefined = any.
        // Ignores hidden files and folders.
        var f;
        var files;
        var i;
        var pattern;
        var results = [];
        if (extensions) {
            pattern = new RegExp("\." + extensions + "$", "i");
        } else {
            // Any extension.
            pattern = new RegExp(
                "\.8PBS|AFX|AI|ARW|BLZ|BMP|CAL|CALS|CIN|CR2|CRW|CT|DCM|DCR|DCS|DCX|DDS|" +
                "DIB|DIC|DNG|DPX|EPS|EPSF|EXR|FFF|FIF|GIF|HDP|HDR|HEIC|HEIF|ICB|ICN|ICO|" +
                "ICON|IIQ|IMG|J2C|J2K|JIF|JIFF|JP2|JPC|JPE|JPEG|JPF|JPG|JPS|JPX|JXR|KDK|" +
                "KMZ|KODAK|MOS|MRW|NCR|NEF|ORF|PAT|PBM|PCT|PCX|PDD|PDF|PDP|PEF|PGM|PICT|" +
                "PMG|PNG|PPM|PS|PSB|PSD|PSDC|PSID|PVR|PXR|RAF|RAW|RLE|RSR|SCT|SRF|TGA|TIF|" +
                "TIFF|TRIF|U3D|VDA|VST|WBMP|WDP|WEBP|WMP|X3F$", "i");
        }
        files = folder.getFiles();
        for (i = 0; i < files.length; i++) {
            f = files[i];
            if (!f.hidden) {
                if (f instanceof Folder && subfolders) {
                    // Recursive (function calls itself).
                    results = results.concat(getFiles(f, subfolders, extensions));
                } else if (f instanceof File && pattern.test(f.name)) {
                    // Ignore EPS if not raster.
                    if (/\.(eps)$/i.test(f.name)) {
                        // Determine if creator is Photoshop.
                        f.open("r");
                        // If Photoshop, creator will be early.
                        // Save time and read only first 512 characters.
                        var data = f.read(512);
                        f.close();
                        if (!/Adobe Photoshop/.test(data)) {
                            // NOT Photoshop EPS.
                            continue;
                        }
                    }
                    results.push(f);
                }
            }
        }
        return results;
    }

    function maskLayer() {
        // Mask active layer using document selection.
        var desc1 = new ActionDescriptor();
        var ref1 = new ActionReference();
        desc1.putClass(charIDToTypeID("Nw  "), charIDToTypeID("Chnl"));
        ref1.putEnumerated(charIDToTypeID("Chnl"), charIDToTypeID("Chnl"), charIDToTypeID("Msk "));
        desc1.putReference(charIDToTypeID("At  "), ref1);
        desc1.putEnumerated(charIDToTypeID("Usng"), charIDToTypeID("UsrM"), charIDToTypeID("RvlS"));
        executeAction(charIDToTypeID("Mk  "), desc1, DialogModes.NO);
    }

    function process() {
        var baseName;
        var bounds;
        var doc;
        var docClean;
        var f;
        var file;
        var fileName;
        var fileOutput;
        var fileVersion;
        var files;
        var fullPath;
        var i;
        var nameOutput;
        var pathOutput;
        var saveOptions;
        var subpath;
        // Preserve preferences.
        var preserve = {
            rulerUnits: app.preferences.rulerUnits
        };
        app.displayDialogs = DialogModes.NO;
        app.preferences.rulerUnits = Units.PIXELS;
        format = listFormat.selection.index;
        extension = extensions[format];
        progress.display("Reading folder...");
        try {
            files = getFiles(folderInput, cbSubfolders.value);
            if (!files.length) {
                doneMessage = "No files found in selected folder";
                return;
            }
            progress.set(files.length);
            count = 0;
            for (i = 0; i < files.length; i++) {
                file = files[i];
                subpath = File.decode(file.path).replace(File.decode(folderInput.fullName), "");
                fileName = File.decode(file.name);
                baseName = fileName.replace(/\.[^\.]*$/, "");
                if (cbRenameWeb.value) {
                    baseName = baseName.replace(/[^0-9a-zA-Z-\.\-]/g, "-").replace(/-{2,}/g, "-");
                }
                if (cbLowercase.value) {
                    baseName = baseName.toLowerCase();
                }
                progress.display(fileName);
                try {
                    doc = app.open(file);
                } catch (e) {
                    if (/User cancel/.test(e.message)) {
                        throw e;
                    }
                    log.addFile(file.fullName, "Cannot open the file");
                    progress.increment();
                    continue;
                }
                try {
                    doc.flatten();
                    doc.changeMode(ChangeMode.RGB);
                    doc.bitsPerChannel = BitsPerChannelType.EIGHT;
                    doc.convertProfile("sRGB IEC61966-2.1", Intent.RELATIVECOLORIMETRIC);
                    // REMOVE BACKGROUND
                    if (cbRemoveBg.value) {
                        bounds = processDocRemoveBg(doc);
                        if (cbCrop.value && bounds) {
                            processDocCrop(doc, bounds);
                        }
                    }
                    // LIMIT PIXELS
                    if (cbMaxPixels.value) {
                        processDocMaxPixels(doc, inpMaxPixelsWide.text, inpMaxPixelsHigh.text);
                    }
                    // MAKE CLEAN DUPLICATE (to clear metadata, EXIF, etc.)
                    docClean = app.documents.add(doc.width, doc.height, 72, doc.name);
                    docClean.mode = DocumentMode.RGB;
                    docClean.colorProfileType = ColorProfile.NONE;
                    app.activeDocument = doc;
                    doc.layers[0].duplicate(docClean);
                    doc.close(SaveOptions.DONOTSAVECHANGES);
                    doc = docClean;
                    app.activeDocument = doc;
                    doc.layers[1].remove();
                    // Set output path.
                    pathOutput = folderOutput.fullName;
                    if (subpath) {
                        pathOutput += subpath;
                    }
                    f = new Folder(pathOutput);
                    if (!f.exists) {
                        f.create();
                    }
                    // Add extension and build full path.
                    nameOutput = baseName + inpSuffix.text + "." + extension;
                    fullPath = pathOutput + "/" + nameOutput;
                    fileOutput = new File(fullPath);
                    if (!cbReplaceOutput.value) {
                        // RESOLVE EXISTING FILES
                        fileVersion = 1;
                        while (fileOutput.exists) {
                            fileVersion++;
                            nameOutput = baseName + inpSuffix.text + "-" + fileVersion + "." + extension;
                            fullPath = pathOutput + "/" + nameOutput;
                            fileOutput = new File(fullPath);
                        }
                    }
                    // Save.
                    switch (format) {
                        case 0: // JPG
                            saveOptions = new JPEGSaveOptions();
                            saveOptions.embedColorProfile = false;
                            saveOptions.formatOptions = FormatOptions.PROGRESSIVE;
                            saveOptions.matte = MatteType.WHITE;
                            saveOptions.quality = Number(listJpgQuality.selection.text);
                            saveOptions.scans = 3;
                            doc.saveAs(fileOutput, saveOptions);
                            break;
                        case 1: // PNG
                            saveOptions = new PNGSaveOptions();
                            saveOptions.compression = 5;
                            saveOptions.interlaced = false;
                            doc.saveAs(fileOutput, saveOptions);
                            break;
                        case 2: // WEBP
                            var s2t = function (s) {
                                return app.stringIDToTypeID(s);
                            };
                            var descriptor = new ActionDescriptor();
                            var descriptor2 = new ActionDescriptor();
                            descriptor2.putEnumerated(s2t("compression"), s2t("WebPCompression"), s2t("compressionLossy")); // "compressionLossy" or "compressionLossless"
                            descriptor2.putInteger(s2t("quality"), 75); // 0 low image quality - 100 high image quality, only valid for "compressionLossy"
                            descriptor2.putBoolean(s2t("includeXMPData"), false); // boolean
                            descriptor2.putBoolean(s2t("includeEXIFData"), false); // boolean
                            descriptor2.putBoolean(s2t("includePsExtras"), false); // boolean
                            descriptor.putObject(s2t("as"), s2t("WebPFormat"), descriptor2);
                            descriptor.putPath(s2t("in"), new File(fileOutput, saveOptions));
                            descriptor.putBoolean(s2t("copy"), true);
                            descriptor.putBoolean(s2t("lowerCase"), true);
                            descriptor.putBoolean(s2t("embedProfiles"), true); // boolean
                            executeAction(s2t("save"), descriptor, DialogModes.NO);
                            break;
                        default:
                            // None of the above.
                            throw new Error("Bad file format.");
                    }
                } catch (e) {
                    if (/User cancel/.test(e.message)) {
                        throw e;
                    }
                    log.addFile(file.fullName, "Error line " + e.line + ": " + e.message);
                } finally {
                    doc.close(SaveOptions.DONOTSAVECHANGES);
                }
                count++;
                progress.increment();
            }
        } finally {
            // Restore preferences.
            app.preferences.rulerUnits = preserve.rulerUnits;
            app.displayDialogs = DialogModes.ERROR;
        }
    }

    function processDocCrop(d, b) {
        // d = document
        // b = selection bounds
        var w;
        var h;
        var margin;
        w = Number(b[2] - b[0]);
        h = Number(b[3] - b[1]);
        margin = Math.max(w, h) * (Number(inpPercent.text) / 100);
        b[0] = Math.max(0, b[0] - margin);
        b[1] = Math.max(0, b[1] - margin);
        b[2] = Math.min(d.width, b[2] + margin);
        b[3] = Math.min(d.height, b[3] + margin);
        d.crop(b);
    }

    function processDocMaxPixels(d, w, h) {
        var height = d.height;
        var scale;
        var scaleHeight = 1;
        var scaleWidth = 1;
        var width = d.width;
        var isEmpty = function (text) {
            return text.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "").length == 0;
        };
        if (!isEmpty(w)) {
            width = Number(w);
        }
        if (!isEmpty(h)) {
            height = Number(h);
        }
        if (width < d.width) {
            scaleWidth = width / d.width;
        }
        if (height < d.height) {
            scaleHeight = height / d.height;
        }
        scale = Math.min(scaleWidth, scaleHeight);
        if (scale < 1) {
            d.resizeImage(d.width * scale, d.height * scale, null, ResampleMethod.BICUBICSHARPER);
        }
    }

    function processDocRemoveBg(doc) {
        var bounds;
        var channel;
        var desc1;
        var i;
        var results;
        var selectSubject = rbSubject.value;
        results = [];
        if (rbPath.value) {
            if (doc.pathItems.length) {
                // Use first path found.
                doc.pathItems[0].makeSelection(0, true, SelectionType.REPLACE);
            } else {
                results.push("No paths found. Using select subject instead.");
                selectSubject = true;
            }
        } else if (rbAlpha.value) {
            for (i = 0; i < doc.channels.length; i++) {
                channel = doc.channels[i];
                if (channel.kind == ChannelType.MASKEDAREA || channel.kind == ChannelType.SELECTEDAREA) {
                    // Make selection from first alpha channel found.
                    (function () {
                        var desc1 = new ActionDescriptor();
                        var ref1 = new ActionReference();
                        ref1.putProperty(charIDToTypeID('Chnl'), stringIDToTypeID("selection"));
                        desc1.putReference(charIDToTypeID('null'), ref1);
                        var ref2 = new ActionReference();
                        ref2.putName(charIDToTypeID('Chnl'), channel.name);
                        desc1.putReference(charIDToTypeID('T   '), ref2);
                        executeAction(charIDToTypeID('setd'), desc1, DialogModes.NO);
                    })();
                    break;
                }
            }
            if (i == doc.channels.length) {
                results.push("No alpha channels found. Using select subject instead.");
                selectSubject = true;
            }
        }
        if (selectSubject) {
            try {
                desc1 = new ActionDescriptor();
                desc1.putBoolean(stringIDToTypeID("sampleAllLayers"), false);
                executeAction(stringIDToTypeID('autoCutout'), desc1, DialogModes.NO);
            } catch (e) {
                if (/User cancel/.test(e.message)) {
                    throw e;
                }
                results.push("Failed to select subject. Background remains.");
                log.addFile(doc.fullName.fullName, results);
                return null;
            }
        }
        bounds = doc.selection.bounds;
        try {
            maskLayer();
        } catch (_) {
            results.push("Failed to mask image. Background remains.");
            log.addFile(doc.fullName.fullName, results);
            return null;
        }
        if (results.length) {
            log.addFile(doc.fullName.fullName, results);
        }
        return bounds;
    }

    function validatePixels() {
        var s;
        var v;
        s = this.text.replace(/[^0-9]/g, "");
        if (s != this.text) {
            this.text = s;
            alert("Numeric input only. Non-numeric characters removed.", " ", false);
        }
        // Make integer.
        v = Math.round(Number(s) || 0);
        if (v == 0) {
            // Zero is equivalent to blank.
            this.text = "";
        } else {
            this.text = v.toString();
        }
    }

})();
