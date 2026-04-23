const ctx = document.getElementById('metricsChart').getContext('2d');

let chart;

const dataSets = {
  traffic: [12,19,3,5,2,3],
  content: [2,3,20,5,1,4],
  engagement: [3,10,13,15,22,30],
  all: [12,19,3,5,2,3]
};

function renderChart(type){
  if(chart) chart.destroy();

  chart = new Chart(ctx,{
    type:'line',
    data:{
      labels:['Mon','Tue','Wed','Thu','Fri','Sat'],
      datasets:[{
        label:type,
        data:dataSets[type],
        borderColor:'#FFD700'
      }]
    }
  });
}

document.querySelectorAll('button').forEach(btn=>{
  btn.onclick=()=>renderChart(btn.dataset.view);
});

renderChart('traffic');
