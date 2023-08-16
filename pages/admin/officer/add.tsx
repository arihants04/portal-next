import { Profile } from '@generated/type-graphql';
import LoadingComponent from 'components/LoadingComponent';
import { GetAddOfficerPageDataQuery } from 'lib/generated/graphql';
import { GetServerSideProps } from 'next';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { dehydrate, useQuery } from 'react-query';
import { gqlQueries, queryClient } from 'src/api';
import debounce from 'lodash.debounce';
import MakeUserOfficerCard from 'components/admin/MakeUserOfficerCard';

export const getServerSideProps: GetServerSideProps = async(ctx) => {
    await queryClient.prefetchQuery(['addOfficerPage'], () => 
        gqlQueries.getAddOfficerPageData()
    );
    return {
        props: {
            dehydratedState: dehydrate(queryClient)
        }
    };
}


export default function AddOfficerPage() {
    // Need to get logged in user profile
    const { status, data: signedInUserData } = useSession({ required: true });
    const { data, error, isLoading } = useQuery(
        ['addOfficerPage'], 
        () => gqlQueries.getAddOfficerPageData(),
        { enabled: status === 'authenticated' }
    )
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [profiles, setProfiles] = useState<GetAddOfficerPageDataQuery["me"]["userProfiles"]>([]);
    let filteredProfiles = profiles;
    if (searchQuery !== "") {
        filteredProfiles = profiles.filter((profile) => 
            profile.netid === searchQuery 
            || `${profile.firstName} ${profile.lastName}`.toLowerCase() === searchQuery.toLowerCase()
            || profile.firstName.toLowerCase() === searchQuery.toLowerCase()
            || profile.lastName.toLowerCase() === searchQuery.toLowerCase()
        );
    } else {
        filteredProfiles = [];
    }

    const debouncedResults = useMemo(() => {
        return debounce((e) => setSearchQuery(e.target.value), 300);
    }, []);

    useEffect(() => {
        if (isLoading) return;
        if (data) setProfiles(data.me.userProfiles);
    }, [data, isLoading]);

    useEffect(() => {
        return () => {
            debouncedResults.cancel();
        };
    });

    if (isLoading) return <LoadingComponent />;

    return <div className="p-5">
        <h1 className="text-2xl text-white p-3">Add user to division as officer</h1>
        {/* Search Box (search by either name or netid) */}
        <input placeholder='Start off by looking for someone by their name or netid' className="bg-transparent border border-2-gray rounded-2xl w-full lg:w-3/5 text-white" type="text" onChange={debouncedResults} />


        {/* Data result (show all data that matches) */}
        {filteredProfiles.map((profile) => 
            (<div key={profile.id} className="my-3 w-3/5">
                <MakeUserOfficerCard 
                    firstName={profile.firstName}
                    lastName={profile.lastName}
                    netid={profile.netid}
                    divisions={data?.me.profile?.officer?.divisions.map(({ id, deptName }) => ({
                        id, deptName
                    })) || []}
                    profileId={profile.id}
                />
            </div>)
        )}
    </div>
}