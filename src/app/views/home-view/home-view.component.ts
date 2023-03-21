import { Component, OnInit } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { MatchInfo } from 'src/app/services/api-service/api.service';
import { ConnectionManagerService } from 'src/app/services/connection-manager.service';
@Component({
  selector: 'app-home-view',
  templateUrl: './home-view.component.html',
  styleUrls: ['./home-view.component.scss']
})
export class HomeViewComponent implements OnInit {

  gamelist:MatchInfo[]=[];
  hasGames:boolean = true;

  loading:boolean = true;
  autorefresh:boolean = false;
  view_mode: string = "card";

  stateOptions: any[]= [{icon: 'pi pi-bars', value: 'table'}, {icon: 'pi pi-th-large', value: 'card'}];

  // This is used to autorefresh every 5 seconds (initialized later)
  refreshSub:Subscription=new Subscription();


  // Questa funzione serve per mostrare il tempo nella view, perché apparentemente
  // non posso usare Math nella valutazione di Typescript nell' html
  truncateDecimals = function (number:number) {
    return Math[number < 0 ? 'ceil' : 'floor'](number);
  };
  

  constructor(private connectionManager:ConnectionManagerService) {

    // Actual refresh is done every 10 seconds only to not overwhelm server.
    if(this.autorefresh){
      this.refreshSub = interval(10000).subscribe(func => { if (this.autorefresh){this.onClickRefresh()} else {};})
    }

    // Fake autorefresh (only dials down time and deletes game if it reaches 0!)
      this.refreshSub = interval(1000)
      .subscribe( ()=> { 
          for(let i=0;i<this.gamelist.length;i++){
            if(this.gamelist[i].time >= 0 || this.gamelist[i].running){
              this.gamelist[i].time = this.gamelist[i].time - 1;
            }
            else{
              this.gamelist.splice(i,1);
              }
            }
          }
        )

    
  }

  ngOnInit(): void {
    this.onClickRefresh();
  }

 
  onClickRefresh(){

    let onSuccess = (gameList:MatchInfo[])=>{ 
      this.loading=true;
      this.gamelist = gameList;
      this.hasGames = this.gamelist.length !== 0;
      for(let i=0;i<this.gamelist.length;i++){
        this.gamelist[i].time=(this.gamelist[i].time-Date.now()/1000);
      }
      this.loading=false;
    }
    this.connectionManager.lobbyList1(onSuccess)

  }

  abs(num: number) {
    return Math.abs(num);
  }
}
