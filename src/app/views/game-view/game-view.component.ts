import { Component, OnInit } from '@angular/core';
import { ApiService, MatchInfo } from 'src/app/services/api-service/api.service';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { ConnectionManagerService } from 'src/app/services/connection-manager.service';
import { LobbyEventType } from 'src/app/services/api-service/api.service';
import { ChatMessage, ChatSender } from 'src/app/ChatMessage';
import { TauriService } from '../../services/tauri-service/tauri.service';
import { ConnectCommand } from '../../services/api-service/api.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-game-view',
  templateUrl: './game-view.component.html',
  styleUrls: ['./game-view.component.scss']
})
export class GameViewComponent implements OnInit {

  //Connect command
  connectCmd?: ConnectCommand;

  apiService: ApiService;

  //Gen
  game! : MatchInfo | null;
  gameId : string= "" ;
  gameName : string = "";
  currStep : number = 0;
  hasPassword:boolean = true;
  errorMessage:string="";
  gameErrorMessage:string="";
  gameStdErrorMessages:string="";

  // Upload screen
  myfile:any[] = [];
  submitted:boolean = false;
  currProgramName:string = "No uploaded file yet."
  uploadData:any={};

  // Messages from APIs
  lastMatchState!:MatchInfo;
  serverMsgBuffer = "";
  newMsg:string = "";
  messages:ChatMessage[] = [];

  executableParameters:string = "";

  tauriService = new TauriService();

  constructor(
    private activatedroute:ActivatedRoute,
    private connectionService:ConnectionManagerService,
    private ref:ChangeDetectorRef) { 
      this.apiService = connectionService.api!;
     }

  ngOnInit(): void {
    let token = this.activatedroute.snapshot.paramMap.get('id');
    // Asks APIs for list and saves game if current game exists
    let validLobbies:MatchInfo[]=[]
    if (token){
      let onSuccess = (matchList:MatchInfo[])=>{
        validLobbies=matchList;
        //Check if this ID exists, if so saves game in this.game
        validLobbies.find( (g) => (this.game = g.id === token ? g : null) )  
        if (this.game){
          this.gameId = this.game!.id;
          this.gameName = this.game!.name;
          this.hasPassword = this.game.password ? true : false;
          console.log("Gameview: Joining game " + this.game)
        }
        else{
          this.game=null;
          console.log("Gameview: game token is not valid.");
        }
      }
      this.connectionService.lobbyList1(onSuccess)
    }
    else {
      this.game=null;
      console.log("Gameview: No token was given.")
    }
  }


  // UPLOAD METHODS
  openFilePicker(){
    // Uses Tauriserver to make a local copy in the front-end server of the player's bot.
    // This is necessary because Tauri wants a path, and we can't see the user's path for
    // security reasons.
    this.tauriService.openFilePicker((absolutePath:string)=>{
      this.uploadData.program = {};
      this.uploadData.program.name = absolutePath.split('\\').pop()?.split('/').pop();
      this.currProgramName = this.uploadData.program.name;
      this.ref.detectChanges();
    }, (reason)=>{
      console.log("Error, could not write file: " + reason)
    })
  }


  navigateToPlay():void{
    this.submitted=true;
    
    if ((this.hasPassword && this.uploadData.password && this.uploadData.program)||(!this.hasPassword &&this.uploadData.program)){ 
  
    // When first connection is established with apiService.connectToPlay, 
    // client will receive a JoinEvent (that will execute a onEvent)
    // and a MatchUpdate (that will execute a onMatchUpdate).

    // Executed on join event
    let onEvent = (type:LobbyEventType)=>{
      if(type == LobbyEventType.End){
        this.messages.push({sender:"server", content:"Game ended!"})
      }
      else{
        this.currStep=1;
      }
    }

    // Executed on match update (you get a match update immediately after joining, as the #
    // of players has changed, or when the match starts)
    let onMatchUpdate = (matchInfo:MatchInfo)=>{
      console.log("onMatchUpdate (join) was executed")


      // This first block of code runs when current player has just joined.
      // It shows already connected players
      if (!this.lastMatchState){ 
        this.newMsg="Connection established."
        this.messages.push({sender:"server",content:this.newMsg})
        if(matchInfo.connected.length>0){
          this.newMsg="Already connected players: "
          for(let i=0; i < matchInfo.connected.length; i++){
            this.newMsg += matchInfo.connected[i] + ", "
          }
          this.newMsg = this.newMsg.substring(0,this.newMsg.length-2)
          this.messages.push({sender:"server",content:this.newMsg})
        }
      }
      // This other branch runs to check if this new update is because the game started or because
      // anonther player joined/left.
      else{ 
        // This is if match started
        if (!this.lastMatchState.running && matchInfo.running){
          this.messages.push({sender:"server",content:"Game is starting!"})
          this.messages.push({sender:"divider",content:"Game started!"})

          this.launchTauri(); //If game started running it's time to run TauriService to start user bot 
        }
  
        // this  is if a player joined/left. It finds the name of the new player
        // by comparing previous and current player list array.
        let newPlayer="";
        let pastConnected=this.lastMatchState.connected;
        let newConnected=matchInfo.connected=matchInfo.connected
        if(pastConnected.length < newConnected.length){
          newPlayer=newConnected.filter((item)=>pastConnected.indexOf(item))[0]
          this.newMsg=newPlayer+" has joined the match!";
          this.messages.push({sender:"server",content:this.newMsg})
        }
        else if (pastConnected.length > newConnected.length){
          newPlayer=pastConnected.filter((item)=>newConnected.indexOf(item))[0]
          this.newMsg=newPlayer+" has left the match!";
          this.messages.push({sender:"server",content:this.newMsg})
        }
      }

      // Saves current info for next time we'll receive a matchInfo, so that we can check differences (e.g. player joined)
      this.lastMatchState=matchInfo;
    }

    // Executed when binary data is exchanged between the player's bot and the server.
    // Messages sent during match are of this kind.
    let onData = (data:string)=>{
      if(data != ""){
        let sender: ChatSender = "server";
        
        this.serverMsgBuffer += data;

        if(this.serverMsgBuffer.endsWith("\n")){
          this.messages.push({sender:sender, content:this.serverMsgBuffer.replaceAll("\n", "<br>")});
          this.sendToTauri(data);
          this.serverMsgBuffer = "";
        }
      }
    }
    
    let onError = (errorMessage:string)=>{
      this.errorMessage = errorMessage;
      console.log(errorMessage)
    }

    this.connectCmd = this.apiService.connectToPlay(
      this.game!.id,
      this.connectionService.username,
      this.uploadData.password,
      onEvent,
      onMatchUpdate,
      onData,
      onError)
    }
  }

  navigateToUpload():void{
    this.currStep=0;
  }

  // TAURI 

  sendToTauri(message:string) {
    this.tauriService.sendToProcess(message);
  }

  launchTauri(){
    console.log("Launching Tauri process");

    let onStdOut = (output:string) => {
      console.log("Tauri output: " + output);
      this.messages.push({sender:"me",content: output.replaceAll("\n", "<br>")});
      this.connectCmd?.sendBinary(output);
    }

    let onStdErr = (error:string) => {
      this.gameStdErrorMessages += "Stderr output: " + error.replaceAll("\n", "<br>");
      console.log("Stderr output: " + error);
    }

    let onErr = (error:string) => {
      this.gameErrorMessage = "Error occurred during execution: " + error;
      console.log("Error occurred during execution: " + error);
    }

    let params = this.executableParameters.trim();
    let paramsArray:string[] = [];

    if(params != ""){
      paramsArray = params.split("\n");
      
      for(let i = 0; i < paramsArray.length; i++){
        paramsArray[i] = paramsArray[i].trim();
      }
    }

    this.tauriService.execProgram(paramsArray, onStdOut, onStdErr, onErr);
  }
}