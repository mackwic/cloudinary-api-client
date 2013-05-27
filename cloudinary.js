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


var module = (function(mod, $http) {
    "use strict";

/*****************************************************
 *
 * Internal functions, not exposed, do not use
 *
 * ***************************************************/


    function urlApi(name, resourceName, action, isHttps) {
        return (isHttps ? 'https' : 'http') +
                '://api.cloudinary.com/v1_1/' +
                name + '/' +
                action + '/' +
                resourceName;
    }

    function urlRes(name, resourceParams, resourceName, isHttps) {
        return (isHttps ? 'https://cloudinary-a.akamaihd.net/'
                        : 'http://res.cloudinary.com/') +
                name + '/' +
                'image/upload/' +
                (resourceParams === undefined ? '' : resourceName + '/') +
                resourceName;
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
    var Cloudinary = function(cloudName, apiKey) {
        if (cloudName === undefined || apiKey === undefined) {
            throw new Error('Cloudinary() need the client name and the api key !');
        }

        this.name = cloudName;
        this.key  = apiKey;
        return this;
    };
    mod.Cloudinary = Cloudinary;

    /**
     * Return an $http.get request forged for downloadin an image from the
     * cloudinary CDN
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
     // next options are supported and provided for reference only
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
        return $http.get(urlRes(this.name, resourceParams, imageName, https));
    };


    return mod;
})(window.cloudinary || {}, $http);

