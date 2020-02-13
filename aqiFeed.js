(function(w, d, t, f) {
    w[f] = w[f] || function(c, k, n) {
        s = w[f], k = s['k'] = (s['k'] || (k ? ('&k=' + k) : ''));
        s['c'] = c = (c instanceof Array) ? c : [c];
        s['n'] = n = n || 0;
        L = d.createElement(t), e = d.getElementsByTagName(t)[0];
        L.async = 1;
        L.src = '//feed.aqicn.org/feed/' + (c[n].city) + '/' + (c[n].lang || '') + '/feed.v1.js?n=' + n + k;
        e.parentNode.insertBefore(L, e);
    };
})(window, document, 'script', '_aqiFeed');