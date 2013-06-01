/*
 * Copyleft | Thomas Wickham 2013 | Copyright
 *
 * This file, and this file *ONLY* is under the GPLv3 Licence and comes with
 * no warranty of correct usability. Use it at your own risks.
 *
 *
 * The Cloudinary API is subject to changes, at the time of this document last
 * update, we are at the version 1.1.
 * 
 * Please report bugs, suggestions, comments, to thomas@wickham.epimeros.org
 *
 */


var cloudinary = (function(mod, $http) {
    'use strict';

/*****************************************************
 *
 * Internal functions, not exposed, do not use
 *
 * ***************************************************/


    function urlApi(name, resourceName, action, isHttps) {
        return (isHttps ? 'https' : 'http') +
                '://api.cloudinary.com/v1_1/' +
                name + '/' +
                'image/upload/' +
                (action !== undefined ? action + '/' : '') +
                (resourceName !== undefined ? resourceName : '');
    }

    function urlRes(name, resourceParams, resourceName, isHttps) {
        return (isHttps ? 'https://cloudinary-a.akamaihd.net/'
                        : 'http://res.cloudinary.com/') +
                name + '/' +
                'image/upload/' +
                (resourceParams === undefined ? '' : resourceParams + '/') +
                resourceName;
    }

    function returnValueIfExists(obj, propName, defaultValue) {
        if (!obj.hasOwnProperty(propName)) {
            return defaultValue;
        } else {
            var descr = obj.getOwnPropertyDescriptor(propName);
            return descr.value;
        }
    }

    function parametrizeIfExists(obj, propName, paramName, convert) {
        if (!obj.hasOwnProperty(propName)) {
            return false;
        }

        var descr = obj.getOwnPropertyDescriptor(propName);
        var res = '';

        if (convert !== undefined) {
            res = convert(descr.value) + '';
            if (res === '') return false;
        } else {
            res = descr.value + '';
        }

        if (paramName === undefined) {
            paramName = propName;
        }

        return paramName + '_' + res;
    }

    function stringify(options) {
        if (options === undefined || !(options instanceof Object ))
            return undefined;

        var knownOpt = [
            { 'name': 'width', 'real': 'w' },
            { 'name': 'height', 'real':'h' },
            { 'name': 'crop', 'real':'c' },
            { 'name': 'x' },
            { 'name': 'y' },
            {
                'name': 'faceDetection',
                'real':'g',
                'convert':function(elt) {
                    if (elt < 1) return '';
                    if (elt == 1) return 'face';
                    return 'faces';
                }
            },
            {
                'name': 'radius',
                'real':'r',
                'convert': function(elt) {
                    if (elt == -1) return 'max';
                    return elt;
                }
            },
            { 'name': 'transformation', 'real':'t' },
            { 'name': 'gravity', 'real':'g' },
            { 'name': 'quality', 'real': 'q' },
            { 'name': 'angle', 'real': 'a' },
            { 'name': 'effect', 'real': 'e' },
            { 'name': 'border', 'real': 'bo' },
            { 'name': 'background', 'real': 'b' },
            { 'name': 'overlay', 'real': 'l' },
            { 'name': 'underlay', 'real': 'u' },
            { 'name': 'default', 'real': 'd' },
            { 'name': 'page', 'real': 'pg' },
            { 'name': 'density', 'real': 'dn' }
        ];

        var res = '';
        var sawOne = false;
        for (var i = 0; i < knownOpt.length; i++) {
            var curr = knownOpt[i];
            var tmp = parametrizeIfExists(options, curr.name, curr.real, curr.convert);
            if (!tmp) continue;

            res += (sawOne ? ',' : '') + tmp;
            sawOne = true;
        }

        return res;
    }


    function readFile(filePath, reference) {
        var reader = new FileReader(); // TODO what about old browsers ?

        if (reader === undefined) {
            throw new Error('FileReader seems to be unsupported on your platform ! Please update your browser');
        }

        reader.onloadend = function (evt) {
            reference.onFileReady(reader.result);
        };

        reader.onabort = function (evt) {
            console.log('Aborting the reading of file ' + filePath);
            reference.abort();
        };

        reader.onerror = function (evt) {
            console.log('Error while reading the file ' + filePath + ' !\n' + evt);
            reference.abort();
        };

        reader.readAsBinaryString(filepath);
    }

/*****************************************************
 *
 * Public functions exposed and documented
 *
 * ***************************************************/

    /**
     * Create a Cloudinary client instance
     * @param cloudName : the name of your cloudinary cloud
     * @param apiKey : your api key
     * @return a client used to interact with cloudinary
     */
    function Cloudinary(cloudName, apiKey, apiSecret) {
        if (cloudName === undefined || apiKey === undefined) {
            throw new Error('Cloudinary() need the client name and the api key !');
        }

        this.name = cloudName;
        this.key  = apiKey;
        this.pass = apiSecret;
        return this;
    }
    mod.Cloudinary = Cloudinary;

    /**
     * Return an URL forged for image downloading from the cloudinary CDN
     *
     * @return an URL string that is suitable for a GET request
     * @param imageName: the name of the image you want, choose your format
     * @param https:boolean, true if you want to download in https
     * @param options: (optional) specific options when getting images, can be:
     *      - width:int|float int is resize in px, float is scaling in percentage
     *              default is 1.0
     *      - height:int|float, see width, default is 1.0
     *      - crop: 'scale'|'fit'|'fill'|'limit'|'pad'|'crop'|'thumb'
     *              defaut is scale
     *      - x:int for fixed croping
     *              defautl is none
     *      - y:int for fixed croping
     *              default is none
     *      - faceDetection:int
     *              <1 => disabled
     *              1  => detect one face
     *              >1 => detect multiple faces
     *              default is 0
     *      - quality:int the image quality
     *              default is 1
     *      - rounded:int round corners of the image in px, -1 give circular img
     *              default is 0
     *      - default_image:string placeholder to get if imageName does not exists
     *
     // next options are supported but provided for reference only
     // you have to see the official doc in order to know the effects and values
     *      - angle:int|string
     *      - effect:string
     *      - border:string
     *      - background:string
     *      - overlay:string
     *      - underlay:string
     *      - page:int (for PDF only)
     *      - density:int (for PDF only)
     *      - transformation:string apply a pre-defined transformation
     */
    Cloudinary.prototype.getImage = function(imageName, https, options) {
        if (imageName === undefined) {
            throw new Error('Cloudinary.getImage() need an image name !');
        }

        var resourceParams = stringify(options);
        return urlRes(this.name, resourceParams, imageName, https);
    };


    /**
     * This method forge an *special* XMLHttpRequest which you can (and should)
     * provide callbacks. The request is not yet fired,
     * fire it with returned.makeSend() function.
     *
     * This method takes care of all cloudinary Authentification business, and
     * pre-set some headers. You have still time to add callback and headers,
     * just modify the returned object.
     *
     * Again, fire the request with returned.makeSend() !
     * DO *NOT* send yourself the request, the result will only be garbage !
     * makeSend() return void, as it can wait external events to be ready.
     *
     * Supported Upload options:
     *   - publicId: string, the public name of your image
     *   - tags: string|(string list), tags assigned for later group reference
     *   - 
     *
     * @return an XMLHttpRequest ready to fire a POST with makeSend()
     *
     */
    Cloudinary.prototype.postImage = function(imagePath, isHttps, uploadOptions) {
        if (imagePath === undefined) {
            throw new Error('Cloudinary.postImage() need an image path !');
        }
        if (this.pass === undefined) {
            throw new Error('Cloudinary.postImage() need your apiSecret to upload !');
        }

        var url  = urlApi(this.name);
        var xhr  = new XMLHttpRequest();

        // keep traces of the progress
        xhr.requestReady = false;
        xhr.fileReady    = false;

        xhr.onFileReady = function (data) {
            if (this.requestReady) {
                this.options.file = data;
                this.send(this.options);
            } else {
                this.fileData = data;
                this.fileReady = true;
            }
        };

        // we keep the file reference because of async reading
        // and correct error managing
        xhr.file = readFile(imagePath, xhr);

        xhr.options = stringifyPost(options, file, this.pass);
        xhr.responseType = 'json'; // TODO detect old broswer and polyfill
        xhr.open('POST', url, isHttps);

        xhr.makeSend = function() {
            if (this.fileReady) {
                this.options.file = xhr.fileData;
                this.send(this.options);
            } else {
                this.requestReady = true;
            }
        };

        return xhr;
    };


    return mod.Cloudinary;
})(window);

