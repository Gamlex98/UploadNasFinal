import { Component } from '@angular/core';
import { AuthenticationService } from './upload-service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AuthenticationComponent {

  fileToUpload !: File ;
  authenticated = false;
  sid = '';
  porcentaje: number = 0;
  enviando: boolean = false;
  overwrite= false;
  carpeta='';
  botonEnviar= false;
  // listaArchivos: DocumentModel [] = [];

  constructor(private authService: AuthenticationService,private http: HttpClient) {}

  authenticate() {
    const usuario = 'Intranet';
    const pass = 'MW50cjQxMjMrLSo=';

    this.authService.authenticate(usuario, pass).subscribe({
      next: (authSid) => {
        this.authenticated = true;
        this.sid = authSid;
        console.log(`SID generado: ${this.sid}`);
      },
      error: (err) => {
        console.error('Authentication failed', err);
      }
    });
  }

  onFileSelected(event: any) {
    this.fileToUpload = event.target.files[0];
  }

  onUpload() {
    if (!this.fileToUpload){
      alert("DEBES SELECCIONAR UN ARCHIVO !!");
      return
    }
    const pruebaCarpeta = 'Pruebita2';
    this.carpeta = pruebaCarpeta;
    const uploadUrl = `http://172.16.1.24:8095/cgi-bin/filemanager/utilRequest.cgi?func=upload&type=standard&sid=${this.sid}&dest_path=/Web/${pruebaCarpeta}&overwrite=1&progress=-Web`;

    const formData = new FormData();
    formData.append('file', this.fileToUpload, this.fileToUpload.name);
    console.log("nombre archivo : " + this.fileToUpload.name);

    const headers = new HttpHeaders();
    headers.append('Content-Type', 'multipart/form-data');
    headers.append('Accept', 'application/json');

    const checkDir = `http://172.16.1.24:8095/cgi-bin/filemanager/utilRequest.cgi?func=get_tree&sid=${this.sid}&is_iso=1&node=/Web`;
    
    //Verificacion Carpeta Existente 
    this.http.get(checkDir).subscribe({
      next: (response) => {
        console.log(response);
        const existe = Object.values(response).filter((item: { name: string; type: string; }) => item.name === pruebaCarpeta && item.type === 'dir');
        if (existe.length === 0) {
          const createDir = `http://172.16.1.24:8095/cgi-bin/filemanager/utilRequest.cgi?func=createdir&type=standard&sid=${this.sid}&dest_folder=${pruebaCarpeta}&dest_path=/Web`;
          this.http.get(createDir).subscribe({
            next: (response) => {
              console.log('LLLEGUE AQUI !!');
              this.doUpload(uploadUrl, formData, headers);
              this.progressBar();
              this.botonEnviar = true;
              console.log('Carpeta Destino : ' + pruebaCarpeta);
            },
            error: (err) => {
              console.error('Error al crear la carpeta de destino', err);
            }
          })
        }
        // } else {
        //   this.doUpload(uploadUrl, formData, headers);
        //   console.log("Carpeta ya existia , se subio el Archivo");
        //   this.botonEnviar= true;
        //   this.progressBar();
        // }  
      },
      error: (err) => {
        console.error('Error al verificar la carpeta de destino', err);
      }
    });

    //Obtener archivos de la Nas y comparar nombre del archivo a subir
    this.authService.getList(this.sid , this.carpeta).subscribe({
      next: async (data) => {
      console.log(data);
      const existingFile = data.find((file: { filename: string; }) => file.filename.toLowerCase() === this.fileToUpload.name.toLowerCase());
      if (existingFile) {
        console.log("Archivo ya existe !!");
        const result = await Swal.fire({
          title: 'El archivo ya existe. ¿Qué deseas hacer?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sobrescribir',
        });
        if (result.isConfirmed) {
          this.doUpload(uploadUrl,formData,headers);
          this.botonEnviar=true;
          this.progressBar();
        // } else if (result.dismiss == Swal.DismissReason.cancel) {
        //   // Permitir al usuario cambiar el nombre del archivo
        //   let newName: string | null = null;
        //   while (!newName) {
        //     newName = window.prompt("Por favor ingrese un nuevo nombre para el archivo:");
        //     if (newName === null) {
        //       // El usuario ha cancelado el prompt
        //       return;
        //     }
        //     newName = newName.trim(); // Eliminar espacios en blanco al inicio y al final
        //     if (newName === "") {
        //       alert("El nombre no puede estar vacío. Por favor, ingrese un nombre válido.");
        //       newName = null;
        //     }
        //   }
        //   //Creacion archivo con el nuevo nombre
        //   const extensionIndex = this.fileToUpload.name.lastIndexOf('.');
        //   const extension = this.fileToUpload.name.substring(extensionIndex);
        //   const newFilename = `${newName}${extension}`;
        //   if (newFilename) {
        //     const newFile =  new File([this.fileToUpload], newFilename, { type: this.fileToUpload.type });
        //     this.fileToUpload = newFile;
        //     this.onUpload();
        //     this.botonEnviar=true;
        //   } 
        // }
      }}
    },
    error: (error) => {
      console.error("Error al obtener la lista de archivos", error);
    }
    });
  }  
    downloadFile(): void {
      this.authService.getList(this.sid , this.carpeta).subscribe({
        next: (data) => {
        console.log("Lista archivos :", data);
        const archivo = data.find((file: { filename: string; }) => file.filename.toLowerCase() === this.fileToUpload.name.toLowerCase());
        if (archivo == null) {
          console.log("No hay archivo para descargar");
          Swal.fire({
            position: 'center',
            icon: 'warning',
            title: 'No hay archivo para DESCARGAR',
            showConfirmButton: false,
            timer: 1000
          })
        }else {
          this.authService.download(this.sid, this.carpeta, this.fileToUpload.name).subscribe((archivo: Blob) => {
            const nombreArchivo = this.fileToUpload.name;
            const url = URL.createObjectURL(archivo);
            const link = document.createElement('a');
            link.href = url;
            link.download = nombreArchivo;
            link.click();
  
            Swal.fire(
              'Archivo descargado Exitosamente !!',
              'Tu archivo ha sido descargado.',
              'success'
            );
            console.log("Descarga Exitosa !!");
          }
          )}
        },
        error: (error) => {
          console.log("Error en la busqueda Archivos", error)
        }
      })
    }
     
    deleteFile():void {
      this.authService.getList(this.sid , this.carpeta).subscribe({
        next: (data) => {
        console.log("Lista archivos :", data);
        const archivo = data.find((file: { filename: string; }) => file.filename.toLowerCase() === this.fileToUpload.name.toLowerCase());
        if (archivo == null) {
          console.log("No hay archivo para eliminar");
          Swal.fire({
            position: 'center',
            icon: 'warning',
            title: 'No hay archivo para ELIMINAR',
            showConfirmButton: false,
            timer: 1000
          })
        }else {
          this.authService.delete(this.sid, this.carpeta,this.fileToUpload.name).subscribe({
            next: () => {
              console.log('Archivo eliminado exitosamente');
              // Limpiar la variable fileToUpload
              Swal.fire(
                'Archivo Borrado Exitosamente !!',
                'Tu archivo ha sido borrado.',
                'success'
              );
              return
            },
            error: (err) => {
              console.error('Error al eliminar el archivo', err);
            }
          });
        }
        },
        error: (error) => {
          console.log("Error en la busqueda Archivos", error)
        }
      })
    }
  
  doUpload(uploadUrl: string, formData: FormData, headers: HttpHeaders) {
    this.http.post(uploadUrl, formData, { headers }).subscribe({
      next: (response) => {
        console.log('Upload successful');
      },
      error: (err) => {
        console.error('Upload failed', err);
      }
    });
  }

  progressBar() {
    this.enviando = true;
    this.porcentaje = 0; // resetear el porcentaje
    let intervalo = setInterval(() => {
      if (this.porcentaje < 100) {
        this.porcentaje += 10;
      } else {
        clearInterval(intervalo);
        this.enviando = false;
      }
    }, 100);
  }
}