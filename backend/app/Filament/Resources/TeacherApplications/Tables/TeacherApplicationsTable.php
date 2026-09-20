<?php

namespace App\Filament\Resources\TeacherApplications\Tables;

use App\Models\TeacherApplication;
use App\Models\User;
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
use Illuminate\Support\Str;

class TeacherApplicationsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->searchable(),
                TextColumn::make('email')
                    ->label('Email address')
                    ->searchable(),
                TextColumn::make('phone'),
                TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'pending' => 'gray',
                        'reviewing' => 'warning',
                        'accepted' => 'success',
                        'rejected' => 'danger',
                        default => 'gray',
                    }),
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
                    ->visible(fn (TeacherApplication $record): bool => (auth()->user()?->can('update', $record) ?? false)
                        && $record->status !== 'accepted')
                    ->action(function (TeacherApplication $record): void {
                        $user = User::withTrashed()->firstWhere('email', $record->email);

                        if ($user) {
                            if ($user->trashed()) {
                                $user->restore();
                            }
                        } else {
                            $user = User::create([
                                'name' => $record->name,
                                'email' => $record->email,
                                'password' => Str::password(),
                            ]);
                        }

                        if (! $user->hasRole('teacher')) {
                            $user->assignRole('teacher');
                        }

                        $record->update(['status' => 'accepted']);
                    }),
                Action::make('reject')
                    ->label('Reject')
                    ->color('danger')
                    ->icon(Heroicon::OutlinedXMark)
                    ->requiresConfirmation()
                    ->visible(fn (TeacherApplication $record): bool => (auth()->user()?->can('update', $record) ?? false)
                        && $record->status !== 'rejected')
                    ->action(fn (TeacherApplication $record) => $record->update(['status' => 'rejected'])),
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
