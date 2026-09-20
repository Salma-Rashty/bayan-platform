<?php

namespace App\Filament\Resources\CourseApplications\Tables;

use App\Models\CourseApplication;
use App\Models\Enrollment;
use Filament\Actions\Action;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Actions\RestoreAction;
use Filament\Actions\RestoreBulkAction;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;

class CourseApplicationsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('user.name')
                    ->label('Applicant')
                    ->searchable(),
                TextColumn::make('course.title')
                    ->searchable(),
                TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'pending' => 'gray',
                        'reviewing' => 'warning',
                        'accepted' => 'success',
                        'rejected' => 'danger',
                        default => 'gray',
                    }),
                TextColumn::make('meeting_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                TrashedFilter::make(),
            ])
            ->recordActions([
                Action::make('accept')
                    ->label('Accept')
                    ->color('success')
                    ->icon(Heroicon::OutlinedCheck)
                    ->requiresConfirmation()
                    ->visible(fn (CourseApplication $record): bool => (auth()->user()?->can('update', $record) ?? false)
                        && $record->status !== 'accepted')
                    ->action(function (CourseApplication $record): void {
                        $record->update(['status' => 'accepted']);

                        Enrollment::createOrReactivate(
                            [
                                'user_id' => $record->user_id,
                                'course_id' => $record->course_id,
                            ],
                            [
                                'status' => 'active',
                                'enrolled_at' => now(),
                            ]
                        );
                    }),
                Action::make('reject')
                    ->label('Reject')
                    ->color('danger')
                    ->icon(Heroicon::OutlinedXMark)
                    ->requiresConfirmation()
                    ->visible(fn (CourseApplication $record): bool => (auth()->user()?->can('update', $record) ?? false)
                        && $record->status !== 'rejected')
                    ->action(fn (CourseApplication $record) => $record->update(['status' => 'rejected'])),
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
