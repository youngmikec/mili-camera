import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Camera, CameraPhoto, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Storage } from '@capacitor/storage';

export interface Photo {
  filepath: string;
  webviewPath: string;
}

@Injectable({
  providedIn: 'root'
})

export class PhotoService {

  // list of photos taken
  public photos: Array<Photo> = [];
  private PHOTO_STORAGE: string = 'photos';
  private platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform
   }

  // code to add new image taken to gallery
  public async addNewToGallery(){
    // Take a photo 
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100
    });

    // save picture and add it to gallery
    const savedPhoto = await this.savePicture(capturedPhoto);
    this.photos.unshift(savedPhoto);
    
    Storage.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos)
    });

  }

  // save photo to storage
  private async savePicture(cameraPhoto: CameraPhoto){
    const base64Data = await this.readAsBase64(cameraPhoto);

    const fileName = new Date().getTime() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    })
    
    return {
      filepath: fileName,
      webviewPath: cameraPhoto.webPath
    }
  }

  //load photos from storage
  public async loadSaved(){
    const photoList = await Storage.get({key: this.PHOTO_STORAGE});
    this.photos = JSON.parse(photoList.value) || [];

    // Display the photo by reading into base64 format
    for (let photo of this.photos) {
      // Read each saved photo's data from the Filesystem
      const readFile = await Filesystem.readFile({
          path: photo.filepath,
          directory: Directory.Data
      });

      // Web platform only: Load the photo as base64 data
      photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
    }
  }

  // base64 reader
  private async readAsBase64(cameraPhoto: CameraPhoto){
    // "hybrid" will detect the platform capacitor or cordova
    if(this.platform.is('hybrid')){
      // Read the file into base64 format
      const file = await Filesystem.readFile({
        path: cameraPhoto.path
      });

      return file.data;
    }else{
      const response = await fetch(cameraPhoto.webPath);
      const blob = await response.blob();
  
      return await this.convertBlobToBase64(blob) as string;

    }
    
  }

  // base64 converter
  convertBlobToBase64 = ( blob: Blob) => new Promise((resolve, reject)=>{
    const reader = new FileReader;
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      }
      reader.readAsDataURL(blob)
  });
}
