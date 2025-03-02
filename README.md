# Trystero API Observer

This is a demonstration application that showcases the various features and capabilities of the Trystero peer-to-peer WebRTC library.

## Features

- **Strategy Selection**: Switch between different connection strategies (nostr, torrent, mqtt, firebase, supabase, ipfs)
- **Room Management**: Join and leave rooms with custom room IDs
- **Peer Tracking**: See when peers join and leave the room
- **Custom Actions**: Send and receive messages with custom action types
- **File Sharing**: Transfer files between peers with progress tracking
- **Media Streaming**: Share your camera or screen with other peers
- **Network Monitoring**: View real-time information about WebRTC connections and relay sockets

## Running the Application

1. First, make sure you have built the Trystero distribution files from the parent directory:

   ```
   cd ..
   npm run build
   cd api-observer
   ```

2. Start the server either from this directory:

   ```
   node serve.js
   ```

   Or from the parent directory:
   
   ```
   npm run api-observer
   ```

3. Open your browser and navigate to:

   ```
   http://localhost:3000
   ```

4. For the best experience, open the application in two separate browser windows to see the peer-to-peer communication in action.

## Using the Application

1. **Select a Strategy**: Choose which connection mechanism you want to use.
2. **Join a Room**: Enter a room ID and click "Join Room".
3. **Send Messages**: Type a message, choose an action name, and send it to all peers.
4. **Share Files**: Click "Send File" to select and share a file with all peers.
5. **Share Media**: Use the "Share Camera" or "Share Screen" buttons to broadcast media to other peers.
6. **Monitor Connections**: Check the network information at the bottom of the page to see details about your WebRTC connections.

## Notes

- The demo requires modern browser features including ES modules and WebRTC support.
- Some strategies may require additional setup (e.g., Firebase, Supabase).
- For testing locally, the default configuration should work without any additional setup.

## Troubleshooting

- If you see errors about missing files, make sure you've run `npm run build` first.
- If connections fail, try a different strategy or check your browser's console for more detailed error messages.
- For Firebase and Supabase strategies, you'll need to provide your own configuration.# api-observer
