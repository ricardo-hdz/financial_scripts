javascript:(function(){
    var k = $('meta[name=keywords]').attr("content");
    var t = [];
    k.split(',').forEach(element => {
        if (element === element.toUpperCase()) {
            t.push(element);
        }
    });
    var str = '<p id="ticks">' + t.join(' ') + '</p>';
    var temp = document.createElement('div');
    temp.innerHTML = str;
    document.body.appendChild(temp.firstChild);
    var range = document.createRange();
    range.selectNodeContents(document.getElementById('ticks'));
    var sel=window.getSelection(); 
    sel.removeAllRanges(); 
    sel.addRange(range)
    document.execCommand('copy');
})();