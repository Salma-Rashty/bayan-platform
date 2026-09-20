<?php

namespace App\Filament\Resources\Assignments\RelationManagers;

use App\Models\Submission;
use Filament\Actions\Action;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\CreateAction;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Actions\RestoreAction;
use Filament\Actions\RestoreBulkAction;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;

class SubmissionsRelationManager extends RelationManager
{
    protected static string $relationship = 'submissions';

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('user_id')
                    ->label('Student')
                    ->relationship('user', 'name', fn ($query) => $query->role('student'))
                    ->searchable()
                    ->preload()
                    ->required(),
                Textarea::make('content')
                    ->columnSpanFull(),
                FileUpload::make('file_path')
                    ->label('File')
                    ->disk('public')
                    ->directory('submissions'),
                DateTimePicker::make('submitted_at')
                    ->required(),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('content')
            ->columns([
                TextColumn::make('user.name')
                    ->label('Student')
                    ->searchable(),
                TextColumn::make('submitted_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('grade')
                    ->numeric(),
                TextColumn::make('feedback')
                    ->limit(50)
                    ->toggleable(),
                TextColumn::make('graded_at')
                    ->dateTime()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                TrashedFilter::make(),
            ])
            ->headerActions([
                CreateAction::make()
                    ->using(function (array $data, RelationManager $livewire): Submission {
                        $data['assignment_id'] = $livewire->getOwnerRecord()->getKey();

                        return Submission::createOrReactivate(
                            [
                                'assignment_id' => $data['assignment_id'],
                                'user_id' => $data['user_id'],
                            ],
                            $data
                        );
                    }),
            ])
            ->recordActions([
                Action::make('grade')
                    ->label('Grade')
                    ->color('success')
                    ->icon(Heroicon::OutlinedCheckBadge)
                    ->visible(fn (): bool => auth()->user()?->hasPermissionTo('grade-homework') ?? false)
                    ->schema([
                        TextInput::make('grade')
                            ->numeric()
                            ->minValue(0)
                            ->required(),
                        Textarea::make('feedback'),
                    ])
                    ->fillForm(fn (Submission $record): array => [
                        'grade' => $record->grade,
                        'feedback' => $record->feedback,
                    ])
                    ->action(function (Submission $record, array $data): void {
                        $record->update([
                            'grade' => $data['grade'],
                            'feedback' => $data['feedback'],
                            'graded_at' => now(),
                        ]);
                    }),
                EditAction::make(),
                DeleteAction::make(),
                RestoreAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                    RestoreBulkAction::make(),
                ]),
            ]);
    }
}
