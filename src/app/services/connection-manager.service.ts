import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, MatchInfo } from './api-service/api.service';

@Injectable({
  providedIn: 'root'
})
export class ConnectionManagerService {
  //private _url: string = "ws://127.0.0.1:8088/";
  private _url: string = "";
  private _username: string = "Username";

  public api?:ApiService;
  //deve prenderlo dalla home
  public lobbylistvar?: MatchInfo[];
  public error: boolean = false;

  constructor(
    private readonly router: Router,
  ) { 
    this.onApiError = this.onApiError.bind(this)
  }

  reloadComponent(self:boolean, urlToNavigateTo ?:string){
    //skipLocationChange:true means dont update the url to / when navigating
   console.log("Current route I am on:",this.router.url);
   const url=self ? this.router.url :urlToNavigateTo;
   this.router.navigateByUrl('/home',{skipLocationChange:true}).then(()=>{
     this.router.navigate([`/${url}`]).then(()=>{
       console.log(`After navigation I am on:${this.router.url}`)
     })
   })
 }

  async onApiError(message: string){
    console.log("Couldn't establish connection! For error " + message);

    // If we reach this point, it means connection with the server was lost (or the login went bad.) Let's go to connect page.

    this.error = true;
    this.reloadComponent(false,"/connect");
  }

  async lobbyList() {
    
    let onSuccess = (gameList:MatchInfo[])=>{ 
      this.lobbylistvar = gameList;
      this.error = false;
      this.router.navigate(['/home']);
    }
    
    let req = this.api!.lobbyList( onSuccess );
    req.onError = (error)=> { this.onApiError(error) };
    console.log(req)
  }

  async lobbyList1(onSuccess:(gameList:MatchInfo[])=>void ) {
    let req = this.api!.lobbyList( onSuccess );
    req.onError = this.onApiError;
  }

  public get isConnected(): boolean{
    return this._username != "";
  }

  public get username(): string {
    return this._username;
  }

  public get url(): string {
    return this._url;
  }

  public async connect(url: string, username: string){
    this._url = url;
    this._username = username;
    this.api = new ApiService(this._url);
    
    // Add the below lines to the connect method
    this.lobbyList();
  }

  public disconnect(): void {
    this._username = "";
    this.error = false;
    this.router.navigate(['/connect']);
    //this.router.navigateByUrl('localhost:4200/connect');
  }

}
