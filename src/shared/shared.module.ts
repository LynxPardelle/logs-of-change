import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
/* Services */
import { LoggerService } from './services/logger.service';
/* Schemas */
import { comboSchema } from './schemas/combo.schema';
import { fileSchema } from './schemas/file.schema';
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'Combo',
        schema: comboSchema,
      },
      {
        name: 'File',
        schema: fileSchema,
      },
    ]),
    SharedModule,
  ],
  controllers: [],
  providers: [LoggerService],
  exports: [
    MongooseModule.forFeature([
      {
        name: 'Combo',
        schema: comboSchema,
      },
      {
        name: 'File',
        schema: fileSchema,
      },
    ]),
    LoggerService,
  ],
})
export class SharedModule {}
