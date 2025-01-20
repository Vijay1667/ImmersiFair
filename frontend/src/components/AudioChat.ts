// import { io, Socket } from "socket.io-client";

import { socket } from "./socket";

export interface AudioChatConfig {
  signalingServerUrl: string;
  stunServer: string;
}

export default class AudioChat {
  //   private socket: Socket;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement;

  constructor(config: AudioChatConfig, remoteAudioElement: HTMLAudioElement) {
    // const existingAudioElement = document.getElementById("remote-audio") as HTMLAudioElement;

    // if (!existingAudioElement) {
    //   this.remoteAudioElement = document.createElement("audio");
    //   this.remoteAudioElement.id = "remote-audio";
    //   this.remoteAudioElement.autoplay = true;
    //   this.remoteAudioElement.controls = false;
    //   document.body.appendChild(this.remoteAudioElement);
    // }
    // else{
    //   this.remoteAudioElement = existingAudioElement;
    // }
    // socket = io(config.signalingServerUrl);
    console.log(remoteAudioElement);

    this.remoteAudioElement = remoteAudioElement!;
    this.remoteAudioElement.addEventListener("play", () => {
      console.log("Audio is playing");
    });
    this.remoteAudioElement.addEventListener("error", (e) => {
      console.error("Audio Playback Error:", e);
    });
    // Assuming you're appending it to the body for simplicity:
    // document.body.appendChild(this.remoteAudioElement);

    socket.on("offer", async ({ offer, sender }) => {
      console.log("Received offer from:", sender);
      console.log(this.peerConnection);
      if (!this.peerConnection) {
        // Initialize the peer connection
        console.log("Initializing new PeerConnection for the received offer...");
        await this.setupPeerConnection(sender);
      }
      console.log("ANSWERING");

      if (this.peerConnection?.signalingState === "stable" ||  this.peerConnection?.signalingState === "have-remote-offer") {
        console.log("Setting remote description with offer...");
        await this.peerConnection?.setRemoteDescription(offer);
        const answer = await this.peerConnection?.createAnswer();
        
        await this.peerConnection?.setLocalDescription(answer!);
        socket.emit("answer", { answer, sender });
        if (!this.localStream) {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        this.localStream.getTracks().forEach((track) => {
          console.log(this.peerConnection);
          console.log("ADDING TRACKS");

          this.peerConnection?.addTrack(track, this.localStream!);
        });
        const localOffer = await this.peerConnection?.createOffer();
        await this.peerConnection?.setLocalDescription(localOffer);
        console.log(sender);

        socket.emit("offer", { offer:localOffer, target: sender });
      }
      else {
        console.warn(
          `Cannot set remote description in signaling state: ${this.peerConnection?.signalingState}`
        );
      }
    });


    socket.on("answer", async ({ answer }) => {
      console.log("Received answer...");

      if (this.peerConnection?.signalingState === "have-local-offer") {
        console.log("Setting remote description with answer...");
        console.log("Offer SDP:", this.peerConnection?.localDescription?.sdp);
        console.log("Answer SDP:", answer.sdp);

        await this.peerConnection.setRemoteDescription(answer);
      } else {
        console.warn(
          `Cannot set remote description in signaling state: ${this.peerConnection?.signalingState}`
        );
      }
    });


    socket.on("ice-candidate", async ({ candidate, sender }) => {
      console.log("Received ICE candidate:", candidate);
      
      if (candidate && (candidate.sdpMid || candidate.sdpMLineIndex !== null)) {
        console.log("Adding ICE candidate:", candidate);
        console.log("ICE CANDIDATE: ", candidate.candidate);

        await this.peerConnection?.addIceCandidate(candidate);
      } else {
        console.warn("Received invalid ICE candidate:", candidate);
      }
    });

    socket.on("disconnectCall", () => {
      console.log("Call disconnected by remote user.");
      this.disconnect("socket");
    })

  }

  public register(userId: string): void {
    socket.emit("register", userId);
  }

  public async startCall(targetUserId: string): Promise<void> {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await this.setupPeerConnection(targetUserId);
    this.localStream.getTracks().forEach((track) => {
      console.log("Adding track to PeerConnection:", track);
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    const offer = await this.peerConnection?.createOffer();
    await this.peerConnection?.setLocalDescription(offer);
    socket.emit("offer", { offer, target: targetUserId });
  }

  private async setupPeerConnection(targetUserId: string): Promise<void> {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE: ", targetUserId, event.candidate);

        socket.emit("ice-candidate", {
          candidate: event.candidate,
          target: targetUserId,
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log("Remote Stream Received:", event.streams[0]);

      this.remoteAudioElement.srcObject = event.streams[0];
      this.remoteAudioElement.muted = true;
      this.remoteAudioElement.play().then(() => {
        this.remoteAudioElement.muted = false;
        console.log("Audio is now unmuted and playing.");
        let disconnectCallButton = document.getElementById("disconnectCall") as HTMLButtonElement;
        // disconnectCallButton.onclick=()=>{this.disconnect("user")};
        console.log(disconnectCallButton);
        if (disconnectCallButton) {
          disconnectCallButton.disabled = false;
          disconnectCallButton.hidden = false;
        }
      })
        .catch((error) => {
          console.error("Error playing muted audio:", error);
        }); // play audio automatically

    };
  }
  public disconnect(requestType: string): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    console.log("Disconnecting call...");

    let disconnectCallButton = document.getElementById("disconnectCall") as HTMLButtonElement;
    // console.log(disconnectCallButton);
    if (disconnectCallButton) {
      disconnectCallButton.disabled = true;
      disconnectCallButton.hidden = true;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream=null;
      
    }
    console.log("Disconnecting call... 2");
    this.remoteAudioElement.srcObject = null;
    if (requestType === "user") {
      console.log("emitting event");
      socket.emit("disconnectCall");
    }

  }
}
