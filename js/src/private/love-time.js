function getRTime(){
  var EndTime= new Date('2014/05/21 23:00:00');
  var NowTime = new Date();
  var t =NowTime.getTime() - EndTime.getTime();

  var d=Math.floor(t/1000/60/60/24);
  var h=Math.floor(t/1000/60/60%24);
  var m=Math.floor(t/1000/60%60);
  var s=Math.floor(t/1000%60);
  var month=Math.ceil(d/30);
  var year=Math.ceil(d/365);

  document.getElementById("t_d").innerHTML = d + "天";
  document.getElementById("t_h").innerHTML = h + "时";
  document.getElementById("t_m").innerHTML = m + "分";
  document.getElementById("t_s").innerHTML = s + "秒";

  document.getElementById("t_month").innerHTML = month ;
  document.getElementById("t_year").innerHTML = year ;
}
setInterval(getRTime,1000);
