/***************
customContent 1.0

fromSearch
fromDomain
searchQuery
refParams
getParams
documentReady
elementReady
***************/

var customContent = {
    cookieRefName: 'customContent_ref',
    cookieGetName: 'customContent_get',
    searchTimeout: 200,

    __init: function(){
        // referrer
        var matches = new RegExp(this.cookieRefName + '=([^; ]*)').exec(document.cookie);
        if (matches) {
            this.referrer = matches[1];
            this.cookieRefFound = true;
        }
        if (typeof this.referrer == 'undefined') {
            this.referrer = document.referrer;
            document.cookie = this.cookieRefName + '=' + this.referrer + '; path=/';
        }
        var matches = /http[s]?:\/\/([^\/]*)\/[^\?]*\??(.*)/.exec(this.referrer);
        this.refParams = {}
        if (matches) {
            this.fulldomain = matches[1];
            var splited = this.fulldomain.split('.');
            this.domain = splited[(splited.length - ((splited.length > 1) ? 2 : 1))];
            if (matches.length > 2) {
                var query = matches[2].split('&');
                for (i in query) {
                    var keyVal = query[i].split('=');
                    this.refParams[keyVal[0]] = decodeURIComponent(keyVal[1]);
                }
            }
        } else {
            this.fulldomain = '';
            this.domain = '';
        }

        // get params
        var matches = new RegExp(this.cookieGetName + '=([^; ]*)').exec(document.cookie);
        if (matches) {
            this.locationSearch = matches[1];
            this.cookieGetFound = true;
        }
        if (typeof this.locationSearch == 'undefined') {
            this.locationSearch = document.location.search;
            document.cookie = this.cookieGetName + '=' + this.locationSearch + '; path=/';
        }
        this.getParams = {};
        var query = this.locationSearch.substr(1).split('&');
        for (i in query) {
            var keyVal = query[i].split('=');
            this.getParams[keyVal[0]] = decodeURIComponent(keyVal[1]);
        }
    },

    reset: function(){
        this.source = undefined;
        this.referrer = undefined;
        var dt = new Date();
        dt.setTime(dt.getTime() - 1000);
        document.cookie = this.cookieRefName + "=; path=/; expires="+dt.toUTCString();
        document.cookie = this.cookieGetName + "=; path=/; expires="+dt.toUTCString();
    },

    __check_params: function(rulesParams, thisParams){
        for (k in rulesParams) {
            if (k in thisParams) {
                if (rulesParams[k] != true && rulesParams[k] != thisParams[k]) {
                    return('param ' + k + ' not equal');
                }
            } else {
                return('param ' + k + ' not exists');
            }
        }
    },

    __do_replace: function(matches, matchIndex, selectorIndex){
        // массив: номер телефона (или любой другой текст) и список селекторов для замены
        if (typeof matchIndex == 'undefined' || typeof selectorIndex == 'undefined') {
            var matchIndex = 0;
            var selectorIndex = 0;
            var isNotAsync = true;
        }

        for (matchIndex; matchIndex < matches[1].length; matchIndex++) {
            // css селектор (поддерживаются классы и идентификаторы)
            var selectors = matches[1][matchIndex].split(' ');
            var domItems = [document];
            for (selectorIndex; selectorIndex < selectors.length; selectorIndex++) {
                var selectorType = selectors[selectorIndex].substr(0, 1);
                var selectorName = selectors[selectorIndex].substr(1);
                var newItems = [];
                for (di in domItems) {
                    switch (selectorType) {
                        case '#': var items = [domItems[di].getElementById(selectorName)]; break;
                        case '.': var items = domItems[di].getElementsByClassName(selectorName); break;
                        default: var items = domItems[di].getElementsByTagName(selectors[selectorIndex]); break;
                    }
                    for (var i = 0; i < items.length; i++) {
                        if (items[i] != null) {
                            newItems.push(items[i]);
                        }
                    }
                }
                if (newItems.length < 1 && !isNotAsync) {
                    setTimeout(function(){
                        customContent.__do_replace(matches, matchIndex, selectorIndex)
                    }, customContent.searchTimeout);
                    return;
                }
                domItems = newItems;
            }
            for (i in domItems) {
                // новый контент
                domItems[i].innerHTML = matches[0];
            }
        }
    },

    __check_ready: function(matches){
        if (this.isReady) return;
        this.isReady = true;

        if (document.addEventListener) {
            document.addEventListener("DOMContentLoaded", function(){
                document.removeEventListener("DOMContentLoaded", arguments.callee, false);
                customContent.__do_replace(matches);
            }, false);
        } else if (document.attachEvent) {
            document.attachEvent("onreadystatechange", function(){
                if (document.readyState === "complete") {
                    document.detachEvent("onreadystatechange", arguments.callee);
                    customContent.__do_replace(matches);
                }
            });

            if (document.documentElement.doScroll && window == window.top) (function(){
                if (this.isReady) return;

                try {
                    document.documentElement.doScroll("left");
                } catch (error) {
                    setTimeout(arguments.callee, 0);
                    return;
                }

                customContent.__do_replace(matches);
            })();
        }

        // window.onload = customContent.__do_replace(matches);
    },

    __check_rule: function(rules, matches){
        if (typeof this.referrer == 'undefined') this.__init();

        if (rules.fromSearch == true) {
            // из поисковика (true / [false])
            if (['google', 'yandex', 'yahoo', 'bing', 'ya'].indexOf(this.domain) == -1) {
                return('not from search engine');
            }
        }
        
        if (rules.fromDomain) {
            // с определенного домена (список строк доменов второго уровня или полных доменных имен)
            for (i in rules.fromDomain) {
                if (rules.fromDomain[i] == this.domain || rules.fromDomain[i] == this.fulldomain) {
                    var fromDomainFound = true;
                    break;
                }
            }
            if (!fromDomainFound) return('domain not found');
        }

        if (rules.searchQuery) {
            // с определенного поискового запроса (список строк)
            try {
                switch (this.domain) {
                    case 'google': this.searchQuery = this.refParams['q'].replace('+', ' '); break;
                    case 'yandex': this.searchQuery = this.refParams['text']; break;
                    case 'bing': this.searchQuery = this.refParams['q'].replace('+', ' '); break;
                    case 'ya': this.searchQuery = this.refParams['text']; break;
                    // case 'yahoo': this.searchQuery = ; break;
                }
            } catch (e) {
                return('search query not found in params');
            }
            for (i in rules.searchQuery) {
                if (rules.searchQuery[i] == this.searchQuery) {
                    var searchQueryFound = true;
                }
            }
            if (!searchQueryFound) return('search query not equal');
        }

        if (rules.refParams) {
            // при наличии определенных GET параметров [и их значений] у рефера
            var error = this.__check_params(rules.refParams, this.refParams);
            if (error) return(error);
        }

        if (rules.getParams) {
            // при наличии определенных GET параметров [и их значений] у этого сайта
            var error = this.__check_params(rules.getParams, this.getParams);
            if (error) return(error);
        }
        
        if (rules.documentReady) {
            this.__check_ready(matches);
        } else if (rules.elementReady) {
            this.__do_replace(matches, 0, 0);
        } else {
            customContent.__do_replace(matches);
        }
    },
    
    replace: function(matches, rules){
        if (this.isLastRule) return;
        var error = this.__check_rule(rules, matches);
        if (error) this.errorText = error;
        if (rules) {
	        if (rules.lastRule && !error) this.isLastRule = true;
        }
    }
};
