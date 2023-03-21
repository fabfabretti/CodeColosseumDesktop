import { Injectable, OnInit } from "@angular/core";
import { Child, Command, open as ShellOpen } from '@tauri-apps/api/shell';
import { fs, path } from '@tauri-apps/api';
import { type } from '@tauri-apps/api/os';
import { open as DialogOpen } from '@tauri-apps/api/dialog';

@Injectable({
  providedIn: 'root'
})
export class TauriService {
  public child: Child | undefined;
  public absoluteFilePath = "";

  public inputBuffer = new Array<string>();

  constructor(){}

  async openFilePicker(onFileWritten:(absolutePath:string)=>void, onError:(reason:any)=>void){
    DialogOpen({
      multiple: false,
    }).then((path) => {
      if(path){
        this.absoluteFilePath = path.toString();
        onFileWritten(path.toString());
      }
      else{
        onError("Error, path is null");
      }
    }, (reason: string) => {
      onError(reason);
    });
  }

  async sendToProcess(message: string){
    if(this.child != null){
      console.log("Sending to Tauri: " + message + ", process " + this.child?.pid);
  
      this.child?.write(message).then((value) => {
        console.log("Write to Tauri of {" + message + "} successful");
      }, (reason) => {
        console.log("Write to Tauri failed: " + reason);
      });
    }
    else{
      console.log("Tauri process not running yet, saving {" + message + "} into queue");
      this.inputBuffer.push(message);
    }
  }

  async writeInputBuffer(){
    for(let i = 0; i < this.inputBuffer.length; i++){
      let value = this.inputBuffer[i];
      console.log("Writing queued message {" + value + "} to Tauri process");
      await this.sendToProcess(value);
    }
  }

  async execProgram(
    args: string[],
    onProcessStdOut: (output:string)=>void,
    onProcessStdErr?: (error:string)=>void,
    onProcessErr?: (error:string)=>void){
      
    const osType = await type();

    let command: Command;
    // In Windows, a new cmd is executed to run the file with its arguments. 
    if (osType == "Windows_NT"){
      command = new Command('sh-windows', [ "/c", `${this.absoluteFilePath.replace("/", "\\")} ${args.join(" ")}`], 
        {"encoding": "utf-8"})
    // In Linux/MacOs, sh is used.
    }
    else{
      command = new Command("sh", ["-c", `"${this.absoluteFilePath}" ${args.join(" ")}`]);
    }

    command.stdout.on("data", (line: any) => {
      if(!line.endsWith("\n")){
        line += "\n";
      }

      onProcessStdOut(line);
    });
    
    command.stderr.on("data", (line:any) => {
      if(!line.endsWith("\n")){
        line += "\n";
      }

      if(onProcessStdErr){
        onProcessStdErr(line);
      }
    });

    command.on("close", ()=>{
      console.log("Process has terminated");
    })

    command.on("error", (error:any)=>{
      console.log("Error occurred during execution: " + error)

      if(onProcessErr){
        onProcessErr(error);
      }
    })

    this.child = await command.spawn();

    this.writeInputBuffer();
  }
}