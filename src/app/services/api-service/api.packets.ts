
export namespace Packets{

    export class PacketsPayload{
      public data;
      public packets;
      public packetTypes:string[] = []

      constructor(data:string){
        this.data = data;
        this.packets = JSON.parse(this.data);
        for (var pkttype in this.packets) {
          this.packetTypes.push(pkttype)
        }
      }

      public getMessage<T extends Message>( packetClass: new ()=>T ):T | null{
        let packetType = packetClass.name;
        for (var pkttype in this.packets) {
          if (pkttype != packetType){ continue; }
          let packet = this.packets[packetType] 
          let message = new packetClass();
          message.fromPacket(packet);
          return message;
        }        
        return null;
      }

    }



  
    export class Message{
      /*
      public msgClasses: Array<string>;
  
      constructor(msgClasses: Array<string>){
        this.msgClasses = [];
  
        msgClasses.forEach((msgClass) => {
          this.msgClasses.push(msgClass);
        });
      }
      */

      constructor(packet?: any){
        if(packet){this.fromPacket(packet);}
      }

      public static dataToPayload(data: string): PacketsPayload{
        let raw = JSON.parse(data);
        return raw;
      }

      

      public static findPacketName(msgClasses: Array<string>, packet: any): string{
        var msgClass = "";
        msgClasses.forEach((msgName) => {
          if(msgName in JSON.parse(packet)){
            msgClass = msgName;
          }
        });
  
        return msgClass;
      }



      public messageName():string{
        return this.constructor.name;
      }
  
      public toPacketWithName(messageName: string){
        const packet = { [messageName]:this };
        return packet;
      }

      public toPacket(): any{
        const packetName = this.messageName();
        const packet = { [packetName]:this };
        return packet;
      }
      
      public fromPacket(packet:any){
        for (var msgField in this) {
          if (! (msgField in packet)){ continue; }
          let value = packet[msgField];
          const varType = typeof value;
          
          if (varType in ["function","undefined","symbol"] ){ continue; }
  
          if (varType === "object") {
            this[msgField] = Object.assign(value);
          } else {
            this[msgField] = value;
          }
        }
        //alert("Deserialized msg "+ msg.MessageName() ) ;
        return true;
      }

      /*
      public fromMultiPacket(payload:string){
        let packets = Message.dataToPayload(payload)
        let packet = Packets.Message.findPacket(packets, this.messageName() );
        if (packet != null) {this.fromPacket(payload);} 
      }
      */
    }

    export class RoyalurArgs{
      public pace?:string;

      constructor(pace?:string) {
        this.pace = pace;
      }
    }

    export class RoshamboArgs{
      public rounds?:string;
      public pace?:string;

      constructor(rounds?:string, pace?:string) {
        this.rounds = rounds;
        this.pace = pace;
      }
    }
  
    export class GameParams {
      public players?:number;
      public bots?:number;
      public timeout?:number;
  
      constructor(players=0, bots=0, timeout=30.0){
        this.players = players;
        this.bots = bots;
        this.timeout = timeout;
      }
    }
  
    export class Result<T1,T2>{
      public Ok?: T1;
      public Err?: T2;
    }
  
    export class MatchInfo {
      public players: number=0;
      public bots: number=0;
      public timeout: number=0.0;
      public args = {};
      public id: string="";
      public name: string="";
      public game: string="";
      public running: boolean=false;
      public time: number=0;
      public connected:any[]=[];
      public spectators: number=0;
      public password: boolean=false;
      public verified: boolean=false;
    }
    
    // Requests ---------------------------------
    export namespace Request{
      export class Message extends Packets.Message {}
      export class Handshake extends Message {
        public version: number = 1;
        public magic: string = "coco";
      }
      export class GameList extends Message  {}
      export class GameDescription extends Message  {
        name?: string;

        constructor(name?: string){
          super();
          this.name = name;
        }
      }
      export class GameNew extends Message  {
        name?:string;
        game?:string;
        params?:GameParams;
        args?:{};   
        password?:string;
        verification?:string;
  
        constructor(name="", game="", players?:number, bots?:number, timeout?:number, args={}, password?:string, verification?:string) {
          super();
          this.name = name;
          this.game = game;
          this.params = new GameParams(players, bots, timeout);
          this.args = args;
          this.password = password;
          this.verification = verification;
        }
      }
      export class LobbyList extends Message  {}
      export class LobbySubscribe extends Message {}
      export class LobbyUnsubscribe extends Message {}
      export class LobbyJoinMatch extends Message {
        id?: string;
        name?: string;
        password?: string;
  
        constructor(id="", name="", password?:string){
          super();
          this.id = id;
          this.name = name;
          this.password = password;
        }
      }
      export class LobbyLeaveMatch extends Message {}
      export class SpectateJoin extends Message {
        id?: string;

        constructor(id="") {
          super();
          this.id = id;
        }
      }
      export class SpectateLeave extends Message  {}
    }


  export namespace Reply{
    export class Message extends Packets.Message {}
    export class Handshake extends Message {
      public magic: string = "";
    }
    export class GameList extends Message { 
      public games= new Array<string>() 
    }
    export class GameDescription extends Message { 
      public  description: string = "" 
    }
    export class GameNew extends Message {
      public id = {"Ok": "", "Err": ""}
    }

    export class LobbyList extends Message {
      public info= new Array<MatchInfo>()
    }

    export class LobbySubscribed extends Message { 
      public seed = Array<MatchInfo>() 
    }

    export class ConnectReply extends Message {}

    export class LobbyJoinedMatch extends ConnectReply { 
      public info = new Result<MatchInfo,string>() 
    }
    export class LobbyNew extends Message { 
      public info = new MatchInfo() 
    }
    export class LobbyUpdate extends ConnectReply {
      public info = new MatchInfo()
    }
    export class MatchStarted extends ConnectReply{}
    export class LobbyDelete extends Message { 
      public id: string = ""
    }
    export class LobbyUnsubscribed extends Message{}
    export class LobbyLeavedMatch extends Message {}
    export class MatchEnded extends Message {}
    export class SpectateJoined extends Message { 
      public info=new Result<MatchInfo,string>()
    }
    export class SpectateStarted extends Message {}
    export class SpectateSynced extends Message {}
    export class SpectateEnded extends Message {}
    export class SpectateLeaved extends Message{}
  }
}